import { getReferenceString, MedplumClient } from '@medplum/core';
import {
  ActivityDefinition,
  Observation,
  Patient,
  PlanDefinition,
  PlanDefinitionAction,
  Reference,
  Resource,
} from '@medplum/fhirtypes';
import { ApplyPlanDefinitionInput } from './types';

export async function resolvePatient(
  medplum: MedplumClient,
  patient: ApplyPlanDefinitionInput['patient'],
): Promise<Patient> {
  if (typeof patient === 'string') {
    const id = patient.includes('/') ? patient.split('/').pop()! : patient;
    return medplum.readResource('Patient', id);
  }
  return medplum.readReference(patient as Reference<Patient>);
}

/** Resolve the chosen combo to a PlanDefinition: id -> name -> canonical url. */
export async function resolvePlanDefinition(
  medplum: MedplumClient,
  combo: string,
): Promise<PlanDefinition> {
  const looksLikeUrl = combo.includes('://');

  if (!looksLikeUrl) {
    // 1. Try as a literal resource id.
    try {
      return await medplum.readResource('PlanDefinition', combo);
    } catch {
      /* fall through */
    }
    // 2. Try as a name/slug.
    const byName = await medplum.searchOne('PlanDefinition', { name: combo });
    if (byName) {
      return byName;
    }
  }

  // 3. Try as a canonical url (with or without |version).
  const url = combo.split('|')[0];
  const byUrl = await medplum.searchOne('PlanDefinition', { url });
  if (byUrl) {
    return byUrl;
  }

  throw new Error(`PlanDefinition not found for combo "${combo}"`);
}

/**
 * Resolve every ActivityDefinition referenced by the plan's actions.
 * Returns a lookup keyed by BOTH the canonical url and "ActivityDefinition/<id>",
 * so an action's exact definitionCanonical string always hits.
 */
export async function resolveActivityDefinitions(
  medplum: MedplumClient,
  plan: PlanDefinition,
): Promise<Map<string, ActivityDefinition>> {
  const canonicals = collectCanonicals(plan.action);
  const map = new Map<string, ActivityDefinition>();

  await Promise.all(
    [...canonicals].map(async (canonical) => {
      const ad = await resolveOneActivityDefinition(medplum, canonical);
      if (ad) {
        map.set(canonical, ad);
        if (ad.url) {
          map.set(ad.url, ad);
        }
        if (ad.id) {
          map.set(`ActivityDefinition/${ad.id}`, ad);
        }
      }
    }),
  );

  return map;
}

async function resolveOneActivityDefinition(
  medplum: MedplumClient,
  canonical: string,
): Promise<ActivityDefinition | undefined> {
  // Relative reference form: "ActivityDefinition/<id>"
  if (canonical.startsWith('ActivityDefinition/')) {
    const id = canonical.split('/')[1];
    return medplum.readResource('ActivityDefinition', id).catch(() => undefined);
  }
  // Canonical url (strip |version)
  const url = canonical.split('|')[0];
  return medplum.searchOne('ActivityDefinition', { url }).catch(() => undefined);
}

function collectCanonicals(actions: PlanDefinitionAction[] | undefined): Set<string> {
  const set = new Set<string>();
  for (const a of actions ?? []) {
    if (a.definitionCanonical) {
      set.add(a.definitionCanonical);
    }
    if (a.action?.length) {
      for (const c of collectCanonicals(a.action)) {
        set.add(c);
      }
    }
  }
  return set;
}

/** Read the profile if it's a Reference; otherwise return the inline object. */
export async function resolveProfile(
  medplum: MedplumClient,
  profile: ApplyPlanDefinitionInput['profile'],
): Promise<unknown> {
  if (profile && typeof profile === 'object' && 'reference' in profile && profile.reference) {
    try {
      return await medplum.readReference(profile as Reference<Resource>);
    } catch {
      return profile;
    }
  }
  return profile ?? {};
}

/** CodeSystems used by evaluate-fenotipo's persisted phenotype Observation. */
export const OBSERVATION_TYPE_SYSTEM = 'https://biowellness.ar/fhir/CodeSystem/observation-type';
export const PERFIL_CLINICO_SYSTEM = 'https://biowellness.ar/fhir/CodeSystem/iscca-perfil-clinico';
export const CONFIRMED_CODE = 'fenotipo-confirmado';
export const PROVISIONAL_CODE = 'fenotipo-provisional';

/**
 * Resolve the CONFIRMED phenotype profile for a patient.
 *
 * Human-in-the-loop gate (per evaluate-fenotipo Layer 3): the orchestrator must NOT act
 * on the provisional profile. We require an Observation with code `fenotipo-confirmado`
 * AND status `final`. Returns the most recent match, or undefined if none exists.
 *
 * The returned Observation is what every applicability condition reads as `%profile`,
 * e.g. `%profile.valueCodeableConcept.coding.where(code='menopausia').exists()`.
 */
export async function resolveConfirmedProfile(
  medplum: MedplumClient,
  patient: Patient,
): Promise<Observation | undefined> {
  const results = await medplum.searchResources('Observation', {
    subject: getReferenceString(patient),
    status: 'final',
    code: `${OBSERVATION_TYPE_SYSTEM}|${CONFIRMED_CODE}`,
    _sort: '-_lastUpdated',
    _count: '1',
  });
  return results[0];
}

/**
 * True if the patient has a provisional phenotype but no confirmed one yet — used to
 * produce a precise "awaiting médico confirmation" error instead of a generic not-found.
 */
export async function hasProvisionalOnly(
  medplum: MedplumClient,
  patient: Patient,
): Promise<boolean> {
  const provisional = await medplum.searchResources('Observation', {
    subject: getReferenceString(patient),
    code: `${OBSERVATION_TYPE_SYSTEM}|${PROVISIONAL_CODE}`,
    _count: '1',
  });
  return provisional.length > 0;
}

/** Extract the iscca-perfil-clinico code from a resolved phenotype Observation. */
export function profileClinicalCode(profile: unknown): string | undefined {
  const obs = profile as Observation | undefined;
  return obs?.valueCodeableConcept?.coding?.find((c) => c.system === PERFIL_CLINICO_SYSTEM)?.code;
}

export function patientReference(patient: Patient): Reference<Patient> {
  return { reference: getReferenceString(patient) as string, display: displayName(patient) };
}

function displayName(patient: Patient): string | undefined {
  const name = patient.name?.[0];
  if (!name) {
    return undefined;
  }
  return [name.given?.join(' '), name.family].filter(Boolean).join(' ') || undefined;
}
