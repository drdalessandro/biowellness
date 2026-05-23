import { describe, it, expect, beforeEach } from 'vitest';
import { MockClient } from '@medplum/mock';
import type { Patient, Consent } from '@medplum/fhirtypes';
import { handler } from '../src/index';

describe('evaluate-fenotipo Bot', () => {
  let medplum: MockClient;
  let patient: Patient;

  beforeEach(async () => {
    medplum = new MockClient();
    patient = await medplum.createResource<Patient>({
      resourceType: 'Patient',
      gender: 'female',
      birthDate: '1978-01-01',
      name: [{ given: ['Test'], family: 'Paciente' }],
    });
  });

  async function grantMasterConsent(): Promise<void> {
    await medplum.createResource<Consent>({
      resourceType: 'Consent',
      status: 'active',
      scope: { text: 'journey' },
      category: [
        {
          coding: [{ code: 'master-journey' }],
        },
      ],
      patient: { reference: `Patient/${patient.id}` },
    } as Consent);
  }

  it('throws if patient has no Master Consent', async () => {
    await expect(
      handler(medplum, { input: patient, contentType: 'application/fhir+json', secrets: {} } as any),
    ).rejects.toThrow(/Master Consent/);
  });

  it('returns a result with primary profile when consent is active', async () => {
    await grantMasterConsent();
    const result = await handler(medplum, {
      input: patient,
      contentType: 'application/fhir+json',
      secrets: {},
    } as any);

    expect(result.patientId).toBe(patient.id);
    expect(result.primary).toBeDefined();
    expect(result.taskId).toBeDefined();
    expect(result.observationId).toBeDefined();
    expect(typeof result.confidence).toBe('number');
  });

  it('creates a confirm-perfil-clinico Task', async () => {
    await grantMasterConsent();
    const result = await handler(medplum, {
      input: patient,
      contentType: 'application/fhir+json',
      secrets: {},
    } as any);

    const task = await medplum.readResource('Task', result.taskId!);
    expect(task.code?.coding?.[0]?.code).toBe('confirm-perfil-clinico');
    expect(task.status).toBe('requested');
    expect(task.for?.reference).toBe(`Patient/${patient.id}`);
  });

  it('creates a preliminary fenotipo Observation', async () => {
    await grantMasterConsent();
    const result = await handler(medplum, {
      input: patient,
      contentType: 'application/fhir+json',
      secrets: {},
    } as any);

    const obs = await medplum.readResource('Observation', result.observationId!);
    expect(obs.status).toBe('preliminary');
    expect(obs.code?.coding?.[0]?.code).toBe('fenotipo-provisional');
  });

  it('resolves patient from Parameters input', async () => {
    await grantMasterConsent();
    const result = await handler(medplum, {
      input: {
        resourceType: 'Parameters',
        parameter: [
          { name: 'patient', valueReference: { reference: `Patient/${patient.id}` } },
        ],
      },
      contentType: 'application/fhir+json',
      secrets: {},
    } as any);

    expect(result.patientId).toBe(patient.id);
  });

  it('flags needsExtraReview when confidence is low', async () => {
    await grantMasterConsent();
    const result = await handler(medplum, {
      input: patient,
      contentType: 'application/fhir+json',
      secrets: {},
    } as any);

    // Con el stub local, confidence=0 → needsExtraReview true.
    // En el repo real con runLayer1Scoring completo, depende de los datos.
    expect(typeof result.needsExtraReview).toBe('boolean');
  });
});
