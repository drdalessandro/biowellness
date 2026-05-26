/**
 * Offline E2E for the orchestrator's pure core (no server).
 *
 * Drives buildJourneyTransaction with the bio-energy fixtures and asserts timing,
 * applicability gating, kind mapping, and CarePlan cross-references.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ActivityDefinition, Patient, PlanDefinition } from '@medplum/fhirtypes';
import { buildJourneyTransaction } from '../src/helpers/transaction-builder';
import { JourneyContext } from '../src/helpers/types';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (p: string) => resolve(here, 'fixtures', p);
const load = <T>(p: string): T => JSON.parse(readFileSync(fx(p), 'utf8')) as T;

const DAY = 86_400_000;
const START = new Date('2026-06-01T09:00:00.000Z');

function activityMap(): Map<string, ActivityDefinition> {
  const bundle = load<{ entry: { resource: ActivityDefinition }[] }>('ActivityDefinitions.bundle.json');
  const map = new Map<string, ActivityDefinition>();
  for (const e of bundle.entry) {
    if (e.resource.url) map.set(e.resource.url, e.resource);
  }
  return map;
}

function ctxFor(profile: unknown): JourneyContext {
  const patient: Patient = { resourceType: 'Patient', id: 'test-bioenergy' };
  return {
    patient,
    patientRef: { reference: 'Patient/test-bioenergy', display: 'Test BioEnergy' },
    profile,
    start: START,
    author: { reference: 'Practitioner/test-author' },
  };
}

const offsetDays = (iso: string): number => Math.round((Date.parse(iso) - START.getTime()) / DAY);

const plan = load<PlanDefinition>('PlanDefinition-pd-combo-bio-energy.json');
const ads = activityMap();
const profiles = load<{ eligible: unknown; notEligible: unknown }>('profiles.json');

describe('apply-plandefinition · journey transaction (bio-energy)', () => {
  describe('confirmed profile = cardio-metabolico (eligible)', () => {
    const result = buildJourneyTransaction(plan, ads, ctxFor(profiles.eligible));

    it('materializes 4 steps, skips 0', () => {
      expect(result.materialized).toBe(4);
      expect(result.skipped).toBe(0);
    });

    it('is an atomic transaction bundle (CarePlan + 4 steps + Provenance)', () => {
      expect(result.bundle.type).toBe('transaction');
      expect(result.bundle.entry).toHaveLength(6);
    });

    it('maps each ActivityDefinition.kind to the right resourceType', () => {
      const kinds = (result.bundle.entry ?? [])
        .map((e) => e.resource?.resourceType)
        .filter((rt) => rt !== 'CarePlan' && rt !== 'Provenance')
        .sort();
      expect(kinds).toEqual(['Appointment', 'MedicationRequest', 'ServiceRequest', 'Task']);
    });

    it('schedules steps at day 0 / +2 / +5 / +28 from start', () => {
      const byType = new Map<string, string>();
      for (const e of result.bundle.entry ?? []) {
        const r = e.resource;
        if (!r || r.resourceType === 'CarePlan' || r.resourceType === 'Provenance') continue;
        const start =
          (r as { occurrenceDateTime?: string }).occurrenceDateTime ??
          (r as { start?: string }).start ??
          (r as { executionPeriod?: { start?: string } }).executionPeriod?.start ??
          (r as { dispenseRequest?: { validityPeriod?: { start?: string } } }).dispenseRequest?.validityPeriod
            ?.start;
        expect(start, `${r.resourceType} has a scheduled start`).toBeTruthy();
        byType.set(r.resourceType, start!);
      }
      expect(offsetDays(byType.get('ServiceRequest')!)).toBe(0);
      expect(offsetDays(byType.get('MedicationRequest')!)).toBe(2);
      expect(offsetDays(byType.get('Task')!)).toBe(5);
      expect(offsetDays(byType.get('Appointment')!)).toBe(28);
    });

    it('links all 4 activities on the CarePlan and pins the plan canonical', () => {
      const cp = (result.bundle.entry ?? []).find((e) => e.resource?.resourceType === 'CarePlan')
        ?.resource as { activity?: unknown[]; instantiatesCanonical?: string[] };
      expect(cp.activity).toHaveLength(4);
      expect(cp.instantiatesCanonical?.[0]).toContain('pd-combo-bio-energy');
    });

    it('back-links every non-Appointment step to the CarePlan fullUrl', () => {
      const cpUrl = result.carePlanFullUrl;
      for (const e of result.bundle.entry ?? []) {
        const r = e.resource;
        if (!r || r.resourceType === 'CarePlan' || r.resourceType === 'Appointment') continue;
        if (r.resourceType === 'Provenance') continue;
        const basedOn = (r as { basedOn?: { reference?: string }[] }).basedOn;
        expect(basedOn?.some((b) => b.reference === cpUrl), `${r.resourceType} basedOn -> CarePlan`).toBe(true);
      }
    });

    it('emits a Provenance covering the CarePlan + all steps (auditoría)', () => {
      const prov = (result.bundle.entry ?? []).find((e) => e.resource?.resourceType === 'Provenance')
        ?.resource as
        | {
            target?: { reference?: string }[];
            activity?: { coding?: { code?: string }[] };
            agent?: { who?: { display?: string }; onBehalfOf?: unknown }[];
            entity?: { role?: string; what?: { display?: string; reference?: string } }[];
          }
        | undefined;
      expect(prov, 'a Provenance entry exists').toBeTruthy();
      // target = CarePlan + 4 steps = 5 references
      expect(prov!.target).toHaveLength(5);
      expect(prov!.target?.[0]?.reference).toBe(result.carePlanFullUrl);
      expect(prov!.activity?.coding?.[0]?.code).toBe('CREATE');
      expect(prov!.agent?.[0]?.who?.display).toBe('Bot apply-plandefinition');
      expect(prov!.agent?.[0]?.onBehalfOf).toEqual({ reference: 'Practitioner/test-author' });
      // source entity includes the version-pinned PlanDefinition canonical
      expect(prov!.entity?.some((en) => en.what?.display?.includes('pd-combo-bio-energy|1.0.0'))).toBe(true);
    });
  });

  describe('confirmed profile = menopausia (IV Boost not applicable)', () => {
    const result = buildJourneyTransaction(plan, ads, ctxFor(profiles.notEligible));

    it('gates out the IV Boost action: 3 steps, 1 skipped', () => {
      expect(result.materialized).toBe(3);
      expect(result.skipped).toBe(1);
      const kinds = (result.bundle.entry ?? [])
        .map((e) => e.resource?.resourceType)
        .filter((rt) => rt !== 'CarePlan' && rt !== 'Provenance');
      expect(kinds).not.toContain('MedicationRequest');
    });
  });
});
