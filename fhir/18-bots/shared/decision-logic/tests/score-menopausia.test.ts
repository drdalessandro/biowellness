import { describe, it, expect } from 'vitest';
import { scoreMenopausia } from '../score-menopausia';
import type { PatientClinicalBundle } from '../types';
import type { QuestionnaireResponse } from '@medplum/fhirtypes';

function makeBundle(overrides: Partial<PatientClinicalBundle>): PatientClinicalBundle {
  return {
    patient: { resourceType: 'Patient', gender: 'female', birthDate: '1978-01-01' },
    observations: [],
    questionnaireResponses: [],
    conditions: [],
    ...overrides,
  };
}

function makeQR(items: Record<string, number | boolean | string>): QuestionnaireResponse {
  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    questionnaire: 'https://biowellness.ar/fhir/Questionnaire/q-diagnostico-bioterrain',
    item: Object.entries(items).map(([linkId, value]) => ({
      linkId,
      answer: [
        typeof value === 'number'
          ? { valueInteger: value }
          : typeof value === 'boolean'
            ? { valueBoolean: value }
            : { valueString: value },
      ],
    })),
  };
}

describe('scoreMenopausia', () => {
  it('returns 0 for male patients', () => {
    const result = scoreMenopausia(
      makeBundle({
        patient: { resourceType: 'Patient', gender: 'male', birthDate: '1980-01-01' },
      }),
    );
    expect(result.score).toBe(0);
  });

  it('returns 0 for women under 35', () => {
    const result = scoreMenopausia(
      makeBundle({
        patient: { resourceType: 'Patient', gender: 'female', birthDate: '2000-01-01' },
      }),
    );
    expect(result.score).toBe(0);
  });

  it('returns high score for 48yo woman with multiple symptoms', () => {
    const result = scoreMenopausia(
      makeBundle({
        patient: { resourceType: 'Patient', gender: 'female', birthDate: '1978-01-01' },
        observations: [
          {
            resourceType: 'Observation',
            status: 'final',
            code: { coding: [{ system: 'http://loinc.org', code: '72133-2' }] },
            valueQuantity: { value: 8 },
            effectiveDateTime: new Date().toISOString(),
          },
        ],
        questionnaireResponses: [
          makeQR({
            'sintoma-vasomotor': 5,
            'amenorrhea-meses': 4,
            'sintoma-cognitivo': 4,
          }),
        ],
      }),
    );
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('caps score at 1.0', () => {
    const result = scoreMenopausia(
      makeBundle({
        patient: { resourceType: 'Patient', gender: 'female', birthDate: '1976-01-01' },
        observations: [
          {
            resourceType: 'Observation',
            status: 'final',
            code: { coding: [{ system: 'http://loinc.org', code: '72133-2' }] },
            valueQuantity: { value: 18 },
            effectiveDateTime: new Date().toISOString(),
          },
        ],
        questionnaireResponses: [
          makeQR({
            'sintoma-vasomotor': 7,
            'amenorrhea-meses': 24,
            'sintoma-cognitivo': 7,
            'sintoma-mood': 7,
          }),
        ],
      }),
    );
    expect(result.score).toBeLessThanOrEqual(1.0);
  });
});
