/**
 * Confirmed-profile resolution (human-in-the-loop gate).
 *
 * The orchestrator reads ONLY the confirmed phenotype (Observation `fenotipo-confirmado`,
 * status `final`) and refuses to act on a merely provisional one (evaluate-fenotipo Layer 3).
 */
import { describe, expect, it } from 'vitest';
import { Observation, Patient } from '@medplum/fhirtypes';
import {
  CONFIRMED_CODE,
  hasProvisionalOnly,
  OBSERVATION_TYPE_SYSTEM,
  profileClinicalCode,
  PROVISIONAL_CODE,
  resolveConfirmedProfile,
} from '../src/helpers/resolvers';

const PATIENT: Patient = { resourceType: 'Patient', id: '474d9758' };

function obs(code: string, status: 'preliminary' | 'final', perfil: string): Observation {
  return {
    resourceType: 'Observation',
    status,
    code: { coding: [{ system: OBSERVATION_TYPE_SYSTEM, code }] },
    subject: { reference: 'Patient/474d9758' },
    valueCodeableConcept: {
      coding: [{ system: 'https://biowellness.ar/fhir/CodeSystem/iscca-perfil-clinico', code: perfil }],
    },
  };
}

/** Minimal MedplumClient stand-in serving a fixed Observation store with simple filtering. */
function mockMedplum(store: Observation[]) {
  return {
    async searchResources(_rt: 'Observation', params: Record<string, string>): Promise<Observation[]> {
      const wantStatus = params.status;
      const wantCode = params.code?.split('|')[1];
      return store.filter(
        (o) =>
          (!wantStatus || o.status === wantStatus) &&
          (!wantCode || o.code?.coding?.some((c) => c.code === wantCode)),
      );
    },
  } as unknown as Parameters<typeof resolveConfirmedProfile>[0];
}

describe('apply-plandefinition · confirmed-profile resolution', () => {
  it('resolves the confirmed (final) Observation, ignoring provisional', async () => {
    const medplum = mockMedplum([
      obs(PROVISIONAL_CODE, 'preliminary', 'menopausia'),
      obs(CONFIRMED_CODE, 'final', 'cardio-metabolico'),
    ]);
    const resolved = await resolveConfirmedProfile(medplum, PATIENT);
    expect(resolved).toBeTruthy();
    expect(profileClinicalCode(resolved)).toBe('cardio-metabolico');
  });

  it('returns undefined when only a provisional profile exists', async () => {
    const medplum = mockMedplum([obs(PROVISIONAL_CODE, 'preliminary', 'menopausia')]);
    expect(await resolveConfirmedProfile(medplum, PATIENT)).toBeUndefined();
  });

  it('detects the awaiting-confirmation state via hasProvisionalOnly', async () => {
    const medplum = mockMedplum([obs(PROVISIONAL_CODE, 'preliminary', 'menopausia')]);
    expect(await hasProvisionalOnly(medplum, PATIENT)).toBe(true);
  });

  it('reads the iscca-perfil-clinico code from a resolved profile', () => {
    expect(profileClinicalCode(obs(CONFIRMED_CODE, 'final', 'longevidad-biohacking'))).toBe(
      'longevidad-biohacking',
    );
    expect(profileClinicalCode({})).toBeUndefined();
  });
});
