import { BotEvent, getReferenceString, MedplumClient } from '@medplum/core';
import { Bundle, CarePlan, Parameters, ParametersParameter, Reference } from '@medplum/fhirtypes';
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
import { ApplyPlanDefinitionInput, AuthorReference, JourneyContext } from './helpers/types';
import { loadClinicalContext, loadLibraryGates } from '../../shared/library-resolver';

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
 * Input contract (FHIR R4 Parameters — repo convention, mirrors evaluate-fenotipo):
 *   { resourceType: "Parameters",
 *     parameter: [
 *       { name: "patient", valueReference: { reference: "Patient/<id>" } },  // or valueString=<id>
 *       { name: "combo",   valueString: "pd-combo-bio-energy" },
 *       { name: "start",   valueString: "2026-06-01T09:00:00.000Z" },         // optional
 *       { name: "profile", valueReference: { ... } }                          // optional
 *     ]
 *   }
 *
 * Returns the persisted CarePlan.
 */
export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Parameters | ApplyPlanDefinitionInput>,
): Promise<CarePlan> {
  const args = extractArgs(event.input);
  if (!args.patient || !args.combo) {
    throw new Error('apply-plandefinition requires { patient, combo }');
  }

  // 1. Resolve patient + plan.
  const [patient, plan] = await Promise.all([
    resolvePatient(medplum, args.patient),
    resolvePlanDefinition(medplum, args.combo),
  ]);

  // 2. Resolve the phenotype profile.
  //    Explicit input wins (test / médico-supplied); otherwise read the CONFIRMED
  //    Observation. No confirmed profile => fail-closed (do not act on provisional).
  let profile: unknown;
  if (args.profile !== undefined) {
    profile = await resolveProfile(medplum, args.profile);
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

  // 3. Resolve the ActivityDefinitions referenced by the plan, plus the gate machinery:
  //    the Library (declarative %library.* gates) and the patient's clinical %context
  //    (Observations/Consents/Encounters). Loaded once; reused for every action's gates.
  const [activityDefs, libraryIndex, clinicalContext] = await Promise.all([
    resolveActivityDefinitions(medplum, plan),
    loadLibraryGates(medplum).catch((err) => {
      console.warn(`[apply-plandefinition] no se pudo cargar la Library: ${(err as Error).message}`);
      return undefined;
    }),
    loadClinicalContext(medplum, patient),
  ]);

  // 4. Build the journey context.
  const ctx: JourneyContext = {
    patient,
    patientRef: patientReference(patient),
    profile,
    start: args.start ? new Date(args.start) : new Date(),
    author: args.author,
  };

  // 5. Assemble the atomic transaction. %library gates are evaluated against the clinical
  //    context; fail-closed (a gate not-implemented/not-met removes its action).
  const { bundle, carePlanFullUrl, materialized, skipped } = buildJourneyTransaction(
    plan,
    activityDefs,
    ctx,
    { libraryIndex, clinicalContext },
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

/**
 * Normalized arguments extracted from `event.input`. Internal use only.
 * The bot accepts FHIR Parameters (repo convention, matching evaluate-fenotipo) and also
 * a plain object {patient, combo, ...} for tests / direct invocation.
 */
interface ExtractedArgs {
  patient?: string | Reference;
  combo?: string;
  start?: string;
  profile?: Reference | Record<string, unknown>;
  author?: AuthorReference;
}

/**
 * Extract the bot arguments from `event.input`. The repo convention (evaluate-fenotipo,
 * lab-ingestion) is that `$execute` delivers a FHIR Parameters resource — read named
 * parameters via `parameter[].name` and the appropriate `value[x]` (valueReference /
 * valueString). For tests and programmatic calls we also accept a plain object.
 */
function extractArgs(input: unknown): ExtractedArgs {
  if (!input || typeof input !== 'object') {
    return {};
  }
  const obj = input as { resourceType?: string };

  if (obj.resourceType === 'Parameters') {
    const params = (input as Parameters).parameter ?? [];
    const find = (name: string): ParametersParameter | undefined => params.find((p) => p.name === name);

    const patientParam = find('patient') ?? find('subject');
    const patient: string | Reference | undefined =
      patientParam?.valueReference ?? patientParam?.valueString ?? undefined;

    const profileParam = find('profile');
    const profile = profileParam?.valueReference ?? (profileParam?.resource as Record<string, unknown> | undefined);

    return {
      patient,
      combo: find('combo')?.valueString,
      start: find('start')?.valueDateTime ?? find('start')?.valueString,
      profile,
      author: find('author')?.valueReference as AuthorReference | undefined,
    };
  }

  // Plain object form (tests / direct calls).
  return input as ExtractedArgs;
}
