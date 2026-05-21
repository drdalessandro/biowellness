import type { PatientClinicalBundle, ProfileScore } from './types';
export function scoreDeporteRunning(_bundle: PatientClinicalBundle): ProfileScore {
  return { profile: 'deporte-running', score: 0, features: [{ feature: 'unimplemented', weight: 0, evidence: 'sem 2' }] };
}
