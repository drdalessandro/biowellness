import type { PatientClinicalBundle, ProfileScore } from './types';
export function scoreLongevidadBiohacking(_bundle: PatientClinicalBundle): ProfileScore {
  return { profile: 'longevidad-biohacking', score: 0, features: [{ feature: 'unimplemented', weight: 0, evidence: 'sem 2' }] };
}
