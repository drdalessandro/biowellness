import { describe, it, expect } from 'vitest';
import { getLoincMapping, LOINC_MAP } from '../src/loinc-map';
import { evaluateCritical } from '../src/critical-values';

describe('loinc-map', () => {
  it('maps hba1c to LOINC 4548-4', () => {
    const m = getLoincMapping('hba1c');
    expect(m?.loinc).toBe('4548-4');
    expect(m?.unit).toBe('%');
  });

  it('maps the 8 ObservationDefinition biomarkers', () => {
    const odBiomarkers = [
      'hba1c', 'lipoproteina-a', 'homocisteina', 'igf-1',
      'dhea-s', 'acido-urico', 'cortisol-matutino', 'testosterona-total',
    ];
    for (const linkId of odBiomarkers) {
      expect(getLoincMapping(linkId), `${linkId} should be mapped`).toBeDefined();
    }
  });

  it('returns undefined for unmapped linkId', () => {
    expect(getLoincMapping('campo-inexistente')).toBeUndefined();
  });

  it('every mapping has loinc, unit, display', () => {
    for (const [linkId, m] of Object.entries(LOINC_MAP)) {
      expect(m.loinc, `${linkId} loinc`).toBeTruthy();
      expect(m.unit, `${linkId} unit`).toBeTruthy();
      expect(m.display, `${linkId} display`).toBeTruthy();
    }
  });
});

describe('critical-values', () => {
  it('flags glucose >= 250 as critical high', () => {
    const r = evaluateCritical('glucosa', 280);
    expect(r.critical).toBe(true);
    if (r.critical) expect(r.direction).toBe('high');
  });

  it('flags glucose <= 50 as critical low', () => {
    const r = evaluateCritical('glucosa', 45);
    expect(r.critical).toBe(true);
    if (r.critical) expect(r.direction).toBe('low');
  });

  it('does not flag normal glucose', () => {
    expect(evaluateCritical('glucosa', 90).critical).toBe(false);
  });

  it('flags HbA1c > 9 as critical', () => {
    expect(evaluateCritical('hba1c', 9.5).critical).toBe(true);
  });

  it('does not flag biomarkers without thresholds', () => {
    expect(evaluateCritical('vitamina-d', 5).critical).toBe(false);
  });

  it('flags hs-CRP > 10 (inflammation contraindication)', () => {
    const r = evaluateCritical('hs-crp', 15);
    expect(r.critical).toBe(true);
    if (r.critical) expect(r.message).toContain('hormesis');
  });
});
