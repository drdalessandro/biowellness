import type { PatientClinicalBundle, ProfileScore } from './types';
export function scoreGenerico(_bundle: PatientClinicalBundle): ProfileScore {
  return { profile: 'generico', score: 0, features: [] };
}
