/**
 * Computa confidence del scoring de Capa 1.
 */
import type { ProfileScore } from './types';

export const LAYER2_INVOCATION_THRESHOLD = 0.75;

export function computeFenotipoConfidence(scores: ProfileScore[]): number {
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  if (sorted.length === 0 || sorted[0].score === 0) return 0;

  const top = sorted[0].score;
  const second = sorted[1]?.score ?? 0;
  const gap = top - second;

  const gapFactor = 0.5 + 0.5 * Math.tanh(gap * 5);
  const confidence = top * gapFactor;

  return Math.min(Math.max(confidence, 0), 1);
}

export function shouldInvokeLayer2(
  confidence: number,
  layer2ConsentGranted: boolean,
): boolean {
  return confidence < LAYER2_INVOCATION_THRESHOLD && layer2ConsentGranted;
}
