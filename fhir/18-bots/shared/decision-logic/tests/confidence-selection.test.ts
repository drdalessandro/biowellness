import { describe, it, expect } from 'vitest';
import {
  computeFenotipoConfidence,
  shouldInvokeLayer2,
  LAYER2_INVOCATION_THRESHOLD,
} from '../compute-fenotipo-confidence';
import { selectDominantProfile } from '../select-dominant-profile';
import type { ProfileScore } from '../types';

function s(profile: ProfileScore['profile'], score: number): ProfileScore {
  return { profile, score, features: [] };
}

describe('computeFenotipoConfidence', () => {
  it('returns 0 for empty scores', () => {
    expect(computeFenotipoConfidence([])).toBe(0);
  });

  it('returns high confidence for clear dominant profile', () => {
    const confidence = computeFenotipoConfidence([
      s('menopausia', 0.85),
      s('cardio-metabolico', 0.20),
    ]);
    expect(confidence).toBeGreaterThan(0.8);
  });

  it('returns low confidence for close top-2 scores', () => {
    const confidence = computeFenotipoConfidence([
      s('menopausia', 0.55),
      s('cardio-metabolico', 0.45),
    ]);
    expect(confidence).toBeLessThan(LAYER2_INVOCATION_THRESHOLD);
  });
});

describe('shouldInvokeLayer2', () => {
  it('returns false when confidence is high', () => {
    expect(shouldInvokeLayer2(0.85, true)).toBe(false);
  });

  it('returns true when confidence is low AND consent granted', () => {
    expect(shouldInvokeLayer2(0.55, true)).toBe(true);
  });

  it('returns false when consent denied', () => {
    expect(shouldInvokeLayer2(0.30, false)).toBe(false);
  });
});

describe('selectDominantProfile', () => {
  it('returns generico when no signal', () => {
    const result = selectDominantProfile([s('menopausia', 0)]);
    expect(result.primary).toBe('generico');
  });

  it('returns primary only when no strong secondary', () => {
    const result = selectDominantProfile([
      s('menopausia', 0.85),
      s('cardio-metabolico', 0.10),
    ]);
    expect(result.primary).toBe('menopausia');
    expect(result.secondary).toBeNull();
  });

  it('returns primary + secondary when second is strong and close', () => {
    const result = selectDominantProfile([
      s('menopausia', 0.65),
      s('cardio-metabolico', 0.55),
    ]);
    expect(result.primary).toBe('menopausia');
    expect(result.secondary).toBe('cardio-metabolico');
  });
});
