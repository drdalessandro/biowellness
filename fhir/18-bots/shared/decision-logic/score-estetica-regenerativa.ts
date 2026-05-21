import type { PatientClinicalBundle, ProfileScore } from './types';
export function scoreEsteticaRegenerativa(_bundle: PatientClinicalBundle): ProfileScore {
  return { profile: 'estetica-regenerativa', score: 0, features: [{ feature: 'unimplemented', weight: 0, evidence: 'sem 2' }] };
}
