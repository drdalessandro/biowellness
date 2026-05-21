/**
 * BIOWELLNESS Decision Logic — Public exports
 * Library: biowellness-decision-logic v0.2.0
 */

export type {
  PatientClinicalBundle,
  ProfileScore,
  ProfileCode,
  ProfileSelection,
  FeatureContribution,
} from './types';

export {
  computeAge,
  extractLatestObservation,
  extractQuestionnaireScore,
  clamp,
} from './helpers';

export { scoreMenopausia } from './score-menopausia';
export { scoreCardioMetabolico } from './score-cardio-metabolico';
export { scoreLongevidadBiohacking } from './score-longevidad-biohacking';
export { scoreEsteticaRegenerativa } from './score-estetica-regenerativa';
export { scoreDeporteRunning } from './score-deporte-running';
export { scoreGenerico } from './score-generico';

export {
  computeFenotipoConfidence,
  shouldInvokeLayer2,
  LAYER2_INVOCATION_THRESHOLD,
} from './compute-fenotipo-confidence';

export { selectDominantProfile } from './select-dominant-profile';

import type { PatientClinicalBundle, ProfileSelection } from './types';
import { scoreMenopausia } from './score-menopausia';
import { scoreCardioMetabolico } from './score-cardio-metabolico';
import { scoreLongevidadBiohacking } from './score-longevidad-biohacking';
import { scoreEsteticaRegenerativa } from './score-estetica-regenerativa';
import { scoreDeporteRunning } from './score-deporte-running';
import { selectDominantProfile } from './select-dominant-profile';

export function runLayer1Scoring(
  bundle: PatientClinicalBundle,
): ProfileSelection {
  const scores = [
    scoreMenopausia(bundle),
    scoreCardioMetabolico(bundle),
    scoreLongevidadBiohacking(bundle),
    scoreEsteticaRegenerativa(bundle),
    scoreDeporteRunning(bundle),
  ];
  return selectDominantProfile(scores);
}
