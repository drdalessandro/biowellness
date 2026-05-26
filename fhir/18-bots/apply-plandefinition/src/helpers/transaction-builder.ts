import {
  ActivityDefinition,
  Bundle,
  BundleEntry,
  CarePlan,
  CarePlanActivity,
  PlanDefinition,
  Provenance,
  Reference,
} from '@medplum/fhirtypes';
import { buildRequestResource, buildTaskFromAction } from './activity-factory';
import { actionApplies } from './condition-evaluator';
import { sequenceActions } from './journey-sequencer';
import { JourneyContext, pinnedCanonical, RequestResource } from './types';

export interface TransactionResult {
  bundle: Bundle;
  carePlanFullUrl: string;
  /** Count of journey steps materialized (excludes the CarePlan itself). */
  materialized: number;
  /** Steps skipped because their applicability condition was false. */
  skipped: number;
}

/**
 * Builds an atomic transaction Bundle containing the CarePlan and every applicable
 * journey step (Task / Appointment / ServiceRequest / MedicationRequest), wired with
 * urn:uuid cross-references so a single POST creates the whole journey.
 */
export function buildJourneyTransaction(
  plan: PlanDefinition,
  activityDefs: Map<string, ActivityDefinition>,
  ctx: JourneyContext,
): TransactionResult {
  const carePlanFullUrl = `urn:uuid:${uuid()}`;
  const scheduled = sequenceActions(plan.action ?? []);

  const stepEntries: BundleEntry[] = [];
  const activities: CarePlanActivity[] = [];
  let skipped = 0;

  for (const step of scheduled) {
    if (!actionApplies(step.action.condition, ctx)) {
      skipped++;
      continue;
    }

    const start = step.absoluteStart ?? isoFromOffset(ctx.start, step.offsetMs);
    const end = step.durationMs ? isoFromOffset(new Date(start), step.durationMs) : undefined;

    let resource: RequestResource;
    const canonical = step.action.definitionCanonical;
    const ad = canonical ? activityDefs.get(canonical) : undefined;

    if (ad) {
      resource = buildRequestResource({
        activityDefinition: ad,
        ctx,
        scheduledStart: start,
        scheduledEnd: end,
        carePlanFullUrl,
        fallbackTitle: step.action.title,
      });
    } else if (canonical) {
      // Referenced AD could not be resolved: skip rather than emit an empty step.
      console.warn(`[apply-plandefinition] unresolved ActivityDefinition "${canonical}" -> skipping`);
      skipped++;
      continue;
    } else {
      // Action with no definition: still capture it as a Task so nothing is lost.
      resource = buildTaskFromAction(step.action, ctx, start, end, carePlanFullUrl);
    }

    const fullUrl = `urn:uuid:${uuid()}`;
    stepEntries.push({
      fullUrl,
      request: { method: 'POST', url: resource.resourceType },
      resource,
    });
    activities.push({
      reference: { reference: fullUrl, display: step.action.title ?? ad?.title },
    });
  }

  const carePlan: CarePlan = {
    resourceType: 'CarePlan',
    status: 'active',
    intent: 'plan',
    title: plan.title,
    description: plan.description,
    // CLAUDE.md: instantiatesCanonical SIEMPRE con versión pineada (auditoría regulatoria).
    instantiatesCanonical: pinnedCanonical(plan) ? [pinnedCanonical(plan)!] : undefined,
    subject: ctx.patientRef,
    author: ctx.author,
    created: ctx.start.toISOString(),
    period: { start: ctx.start.toISOString() },
    activity: activities.length ? activities : undefined,
  };

  const entry: BundleEntry[] = [
    { fullUrl: carePlanFullUrl, request: { method: 'POST', url: 'CarePlan' }, resource: carePlan },
    ...stepEntries,
  ];

  // Provenance (auditoría) — CLAUDE.md: no opcional en cada write significativo.
  // Patrón replicado de lab-ingestion: una entry POST en la MISMA transacción, target =
  // CarePlan + todos los pasos creados, agent = assembler (este Bot), entity.source = la
  // PlanDefinition (canonical pineado) y el perfil confirmado si tiene referencia resoluble.
  const stepUrns = stepEntries.map((e) => e.fullUrl!).filter(Boolean);
  const provenance: Provenance = {
    resourceType: 'Provenance',
    target: [{ reference: carePlanFullUrl }, ...stepUrns.map((urn) => ({ reference: urn }))],
    recorded: new Date().toISOString(),
    activity: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-DataOperation',
          code: 'CREATE',
          display: 'create',
        },
      ],
    },
    agent: [
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type',
              code: 'assembler',
            },
          ],
        },
        who: { display: 'Bot apply-plandefinition' },
        // El médico/autor que prescribió el combo, cuando viene en el input.
        onBehalfOf: ctx.author,
      },
    ],
    entity: provenanceSources(plan, ctx),
  };
  entry.push({ request: { method: 'POST', url: 'Provenance' }, resource: provenance });

  return {
    bundle: { resourceType: 'Bundle', type: 'transaction', entry },
    carePlanFullUrl,
    materialized: stepEntries.length,
    skipped,
  };
}

/**
 * Provenance source entities: the PlanDefinition that was instantiated (version-pinned
 * canonical) and the confirmed phenotype Observation when it carries a resolvable reference.
 */
function provenanceSources(plan: PlanDefinition, ctx: JourneyContext): Provenance['entity'] {
  const sources: NonNullable<Provenance['entity']> = [];

  const planCanonical = pinnedCanonical(plan);
  if (planCanonical) {
    sources.push({ role: 'source', what: { display: planCanonical } });
  }

  // The profile is the resolved confirmed Observation; reference it if it has an id.
  const profile = ctx.profile as { resourceType?: string; id?: string } | undefined;
  if (profile?.resourceType && profile.id) {
    const ref: Reference = { reference: `${profile.resourceType}/${profile.id}` };
    sources.push({ role: 'source', what: ref });
  }

  return sources.length ? sources : undefined;
}

function isoFromOffset(base: Date, offsetMs: number): string {
  return new Date(base.getTime() + offsetMs).toISOString();
}

function uuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) {
    return c.randomUUID();
  }
  // RFC-4122 v4 fallback (uniqueness within the bundle is all we require).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
