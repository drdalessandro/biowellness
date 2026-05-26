import { BotEvent, getReferenceString, MedplumClient } from '@medplum/core';
import { Bundle, CarePlan } from '@medplum/fhirtypes';
import {
  hasProvisionalOnly,
  patientReference,
  profileClinicalCode,
  resolveActivityDefinitions,
  resolveConfirmedProfile,
  resolvePatient,
  resolvePlanDefinition,
  resolveProfile,
} from './helpers/resolvers';
import { buildJourneyTransaction } from './helpers/transaction-builder';
import { ApplyPlanDefinitionInput, JourneyContext } from './helpers/types';

/**
 * apply-plandefinition — Fase 5 / Bot #3 (orquestador).
 *
 * Takes a CONFIRMED phenotype profile + a chosen combo (one of the 5 deployed
 * PlanDefinitions) and materializes the FULL journey CarePlan in one atomic
 * transaction: Tasks / Appointments / ServiceRequests / MedicationRequests, each
 * scheduled relative to the journey start and gated by the action's applicability
 * condition (FHIRPath over the patient + %profile).
 *
 * Model (b) — médico-driven: the caller chooses `combo` explicitly; applicability only
 * filters WHICH actions inside that combo apply. The phenotype is the human-confirmed
 * one (Observation `fenotipo-confirmado`, status `final`); the orchestrator refuses to
 * act on a merely provisional profile (evaluate-fenotipo Layer 3 gate).
 *
 * Design: thin orchestrator over single-responsibility helpers (E1 / ADR-021).
 *   resolvers           — Patient, PlanDefinition, ActivityDefinitions, CONFIRMED profile
 *   journey-sequencer   — per-action offsets (relatedAction + timing)
 *   condition-evaluator — applicability gating via FHIRPath over %profile / %patient
 *   activity-factory    — ActivityDefinition -> concrete request resource
 *   transaction-builder — assemble the atomic CarePlan + steps bundle
 *
 * Returns the persisted CarePlan.
 */
export async function handler(
  medplum: MedplumClient,
  event: BotEvent<ApplyPlanDefinitionInput>,
): Promise<CarePlan> {
  const input = event.input;
  if (!input?.patient || !input?.combo) {
    throw new Error('apply-plandefinition requires { patient, combo }');
  }

  // 1. Resolve patient + plan.
  const [patient, plan] = await Promise.all([
    resolvePatient(medplum, input.patient),
    resolvePlanDefinition(medplum, input.combo),
  ]);

  // 2. Resolve the phenotype profile.
  //    Explicit input wins (test / médico-supplied); otherwise read the CONFIRMED
  //    Observation. No confirmed profile => fail-closed (do not act on provisional).
  let profile: unknown;
  if (input.profile !== undefined) {
    profile = await resolveProfile(medplum, input.profile);
  } else {
    const confirmed = await resolveConfirmedProfile(medplum, patient);
    if (!confirmed) {
      const awaiting = await hasProvisionalOnly(medplum, patient);
      throw new Error(
        awaiting
          ? `apply-plandefinition: phenotype is provisional for ${getReferenceString(patient)} — ` +
            `awaiting médico confirmation (Task confirm-perfil-clinico). Not generating a plan.`
          : `apply-plandefinition: no confirmed phenotype (fenotipo-confirmado, status final) for ` +
            `${getReferenceString(patient)}.`,
      );
    }
    profile = confirmed;
  }

  // 2b. Soft guard: a "generico" phenotype should not drive a plan on its own. In model
  //     (b) the médico picked the combo explicitly, so we proceed but flag it.
  if (profileClinicalCode(profile) === 'generico') {
    console.warn(
      `[apply-plandefinition] generico phenotype for ${getReferenceString(patient)} with ` +
        `explicit combo=${plan.id}; profile-specific actions will likely be gated out.`,
    );
  }

  // 3. Resolve the ActivityDefinitions referenced by the plan.
  const activityDefs = await resolveActivityDefinitions(medplum, plan);

  // 4. Build the journey context.
  const ctx: JourneyContext = {
    patient,
    patientRef: patientReference(patient),
    profile,
    start: input.start ? new Date(input.start) : new Date(),
    author: input.author,
  };

  // 5. Assemble the atomic transaction.
  const { bundle, carePlanFullUrl, materialized, skipped } = buildJourneyTransaction(
    plan,
    activityDefs,
    ctx,
  );

  console.log(
    `[apply-plandefinition] combo=${plan.id} patient=${getReferenceString(patient)} ` +
      `profile=${profileClinicalCode(profile) ?? 'n/a'} steps=${materialized} skipped=${skipped}`,
  );

  // 6. Execute and return the persisted CarePlan.
  // The bundle includes a Provenance entry (auditoría) covering the CarePlan + all steps,
  // following the lab-ingestion pattern (CLAUDE.md: Provenance no opcional).
  const response = (await medplum.executeBatch(bundle)) as Bundle;
  return extractCarePlan(response, carePlanFullUrl);
}

function extractCarePlan(response: Bundle, carePlanFullUrl: string): CarePlan {
  const entries = response.entry ?? [];

  // Prefer the entry that maps back to our CarePlan fullUrl when echoed.
  for (const e of entries) {
    if (e.fullUrl === carePlanFullUrl && e.resource?.resourceType === 'CarePlan') {
      return e.resource as CarePlan;
    }
  }
  // Otherwise the first CarePlan in the response (the transaction creates exactly one).
  for (const e of entries) {
    if (e.resource?.resourceType === 'CarePlan') {
      return e.resource as CarePlan;
    }
  }

  const statuses = entries.map((e) => e.response?.status).join(', ');
  throw new Error(`apply-plandefinition: CarePlan not found in transaction response (statuses: ${statuses})`);
}
