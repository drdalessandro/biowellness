/**
 * Score perfil Cardio-Metabólico
 * Library: biowellness-decision-logic v0.2.0
 *
 * Bridge con EPA Bienestar IA: usa LE8 score si disponible.
 */

import type { PatientClinicalBundle, ProfileScore, FeatureContribution } from './types';
import {
  computeAge,
  extractLatestObservation,
  clamp,
} from './helpers';

const SNOMED_HTA_CODES = ['38341003', '59621000'];
const SNOMED_CV_EVENT_CODES = ['22298006', '194828000', '230690007', '57054005'];

export function scoreCardioMetabolico(
  bundle: PatientClinicalBundle,
): ProfileScore {
  const features: FeatureContribution[] = [];
  let totalScore = 0;

  const age = computeAge(bundle.patient.birthDate);
  if (age !== null && age < 25) {
    return {
      profile: 'cardio-metabolico',
      score: 0,
      features: [{ feature: 'edad-baja', weight: -1, evidence: `${age} años < 25` }],
    };
  }

  // HOMA-IR
  const homa = extractLatestObservation(bundle.observations, '88110-5');
  if (homa !== null) {
    let w = 0;
    if (homa >= 5.0) w = 0.25;
    else if (homa >= 2.5) w = 0.2;
    else if (homa >= 2.0) w = 0.1;

    if (w > 0) {
      totalScore += w;
      features.push({
        feature: 'resistencia-insulinica',
        weight: w,
        evidence: `HOMA-IR ${homa.toFixed(1)}`,
      });
    }
  }

  // TG/HDL
  const tgHdl = extractLatestObservation(bundle.observations, '9830-1');
  if (tgHdl !== null) {
    const threshold = bundle.patient.gender === 'female' ? 1.5 : 2.0;
    if (tgHdl >= threshold) {
      const excess = tgHdl - threshold;
      const w = Math.min(excess / 2, 1) * 0.15;
      totalScore += w;
      features.push({
        feature: 'dislipemia-aterogenica',
        weight: w,
        evidence: `TG/HDL ${tgHdl.toFixed(2)}`,
      });
    }
  }

  // hs-CRP
  const pcr = extractLatestObservation(bundle.observations, '30522-7');
  if (pcr !== null) {
    let w = 0;
    if (pcr >= 3.0 && pcr < 10) w = 0.1;
    else if (pcr >= 2.0 && pcr < 3.0) w = 0.05;

    if (w > 0) {
      totalScore += w;
      features.push({
        feature: 'inflamacion-bajo-grado',
        weight: w,
        evidence: `PCR-us ${pcr.toFixed(2)} mg/L`,
      });
    }
  }

  // HTA
  const hipertension = bundle.conditions.some((c) =>
    c.code?.coding?.some(
      (co) =>
        co.system === 'http://snomed.info/sct' &&
        SNOMED_HTA_CODES.includes(co.code ?? ''),
    ),
  );
  if (hipertension) {
    const w = 0.15;
    totalScore += w;
    features.push({
      feature: 'hipertension-diagnosticada',
      weight: w,
      evidence: 'HTA en Condition',
    });
  }

  // Antecedente CV personal
  const cvHistory = bundle.conditions.some((c) =>
    c.code?.coding?.some(
      (co) =>
        co.system === 'http://snomed.info/sct' &&
        SNOMED_CV_EVENT_CODES.includes(co.code ?? ''),
    ),
  );
  if (cvHistory) {
    const w = 0.2;
    totalScore += w;
    features.push({
      feature: 'antecedente-cv',
      weight: w,
      evidence: 'Condition con código CV',
    });
  }

  return {
    profile: 'cardio-metabolico',
    score: clamp(totalScore, 0, 1),
    features,
  };
}
