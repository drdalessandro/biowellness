/**
 * Selección de perfil dominante + secundario + marginal.
 */
import type { ProfileScore, ProfileSelection } from './types';
import { computeFenotipoConfidence } from './compute-fenotipo-confidence';

export function selectDominantProfile(
  scores: ProfileScore[],
): ProfileSelection {
  const nonZero = scores.filter((s) => s.score > 0);
  const confidence = computeFenotipoConfidence(scores);

  if (nonZero.length === 0) {
    return {
      primary: 'generico',
      secondary: null,
      marginal: null,
      rationale: 'Sin señal clara en ningún perfil. Journey exploratorio.',
      scores,
      confidence,
    };
  }

  const sorted = [...nonZero].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const second = sorted[1];

  if (top.score < 0.3) {
    return {
      primary: 'generico',
      secondary: null,
      marginal: null,
      rationale: `Top score ${top.profile} solo ${top.score.toFixed(2)} < 0.30.`,
      scores,
      confidence,
    };
  }

  let secondary: ProfileSelection['secondary'] = null;
  let marginal: ProfileSelection['marginal'] = null;
  let rationale = `Perfil dominante: ${top.profile} (score ${top.score.toFixed(2)})`;

  if (second) {
    const gap = top.score - second.score;
    if (second.score >= 0.4 && gap < 0.2) {
      secondary = second.profile;
      rationale += `. Secundario: ${secondary} (gap ${gap.toFixed(2)})`;
    } else if (second.score >= 0.3 && gap < 0.1) {
      marginal = second.profile;
      rationale += `. Marginal: ${marginal}`;
    }
  }

  return {
    primary: top.profile,
    secondary,
    marginal,
    rationale,
    scores,
    confidence,
  };
}
