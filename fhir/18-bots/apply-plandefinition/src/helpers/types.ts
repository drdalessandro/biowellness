import {
  Appointment,
  Device,
  MedicationRequest,
  Organization,
  Patient,
  Practitioner,
  PractitionerRole,
  Reference,
  RelatedPerson,
  ServiceRequest,
  Task,
} from '@medplum/fhirtypes';

/** Concrete request resources this orchestrator knows how to materialize from an ActivityDefinition. */
export type RequestResource = ServiceRequest | Appointment | Task | MedicationRequest;

/**
 * Common subset accepted by ServiceRequest/Task/MedicationRequest.requester and
 * CarePlan.author, so a single value threads through every generated resource.
 */
export type AuthorReference = Reference<
  Practitioner | PractitionerRole | Organization | Patient | RelatedPerson | Device
>;

/**
 * Bot input contract: confirmed phenotype profile + chosen combo.
 * Handed off by `evaluate-fenotipo` (or by the confirmation step downstream of it).
 */
export interface ApplyPlanDefinitionInput {
  /** Patient the journey is for. Accepts "Patient/<id>", a bare id, or a Reference. */
  patient: string | Reference<Patient>;

  /**
   * Chosen combo. Accepts (in resolution order):
   *   - the resource id           ("0193...-...")
   *   - the canonical url         ("https://biowellness.ar/fhir/PlanDefinition/pd-combo-bio-energy")
   *   - the bare slug / name      ("pd-combo-bio-energy")
   */
  combo: string;

  /**
   * Confirmed phenotype profile produced by evaluate-fenotipo.
   * Either a Reference to a persisted resource (Observation / QuestionnaireResponse / Patient ...)
   * which the bot will read, or an inline object. Exposed to every
   * PlanDefinition.action.condition FHIRPath as the `%profile` variable.
   */
  profile?: Reference | Record<string, unknown>;

  /** ISO-8601 journey start. Defaults to execution time. Drives ALL relative timing. */
  start?: string;

  /** Optional requester/author (Practitioner | PractitionerRole | Organization | Patient | RelatedPerson | Device). */
  author?: AuthorReference;
}

/** Resolved, denormalized context threaded through every helper. */
export interface JourneyContext {
  patient: Patient;
  patientRef: Reference<Patient>;
  /** Raw profile value used as the `%profile` FHIRPath variable. */
  profile: unknown;
  start: Date;
  author?: AuthorReference;
}

/**
 * Build a version-pinned canonical reference: "url|version" when a version exists,
 * else the bare url. CLAUDE.md requires instantiatesCanonical to always pin version for
 * regulatory auditability. Returns undefined if the resource has no url.
 */
export function pinnedCanonical(resource: { url?: string; version?: string }): string | undefined {
  if (!resource.url) {
    return undefined;
  }
  return resource.version ? `${resource.url}|${resource.version}` : resource.url;
}
