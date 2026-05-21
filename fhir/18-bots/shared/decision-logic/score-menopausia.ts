/**
 * Score perfil Menopausia/Perimenopausia
 * Library: biowellness-decision-logic v0.2.0
 *
 * Patrón: mujer 38-58 con cluster de:
 * - Síntomas vasomotores
 * - Alteración del sueño (PSQI > 5)
 * - Amenorrhea ≥ 3 meses, ciclos irregulares
 * - Síntomas mood/cognitivos
 * - Cambio de composición corporal
 */

import type { PatientClinicalBundle, ProfileScore, FeatureContribution } from './types';
import { computeAge, extractLatestObservation, extractQuestionnaireScore, clamp } from './helpers';

const DIAGNOSTICO_BIOTERRAIN_URL =
  'https://biowellness.ar/fhir/Questionnaire/q-diagnostico-bioterrain';

export function scoreMenopausia(bundle: PatientClinicalBundle): ProfileScore {
  const features: FeatureContribution[] = [];
  let totalScore = 0;

  if (bundle.patient.gender !== 'female') {
    return {
      profile: 'menopausia',
      score: 0,
      features: [{ feature: 'genero-no-femenino', weight: -1, evidence: 'excluyente' }],
    };
  }

  const age = computeAge(bundle.patient.birthDate);
  if (age === null || age < 35 || age > 65) {
    return {
      profile: 'menopausia',
      score: 0,
      features: [{ feature: 'edad-fuera-rango', weight: -1, evidence: `edad ${age ?? 'desconocida'}` }],
    };
  }

  // Componente 1: edad perimenopáusica (gaussian peak 48)
  const sigma = 7;
  const peak = 0.25;
  const edadWeight = peak * Math.exp(-((age - 48) ** 2) / (2 * sigma * sigma));
  totalScore += edadWeight;
  features.push({
    feature: 'edad-perimenopausica',
    weight: edadWeight,
    evidence: `${age} años (peak 45-52)`,
  });

  // Componente 2: vasomotor
  const vasomotorScore = extractQuestionnaireScore(
    bundle.questionnaireResponses,
    DIAGNOSTICO_BIOTERRAIN_URL,
    'sintoma-vasomotor',
  );
  if (vasomotorScore !== null && vasomotorScore >= 2) {
    const w = Math.min(vasomotorScore / 7, 1) * 0.3;
    totalScore += w;
    features.push({
      feature: 'sintomas-vasomotores',
      weight: w,
      evidence: `score vasomotor ${vasomotorScore}/7`,
    });
  }

  // Componente 3: amenorrhea
  const amenorrheaMeses = extractQuestionnaireScore(
    bundle.questionnaireResponses,
    DIAGNOSTICO_BIOTERRAIN_URL,
    'amenorrhea-meses',
  );
  if (amenorrheaMeses !== null) {
    let w = 0;
    if (amenorrheaMeses >= 12) w = 0.2;
    else if (amenorrheaMeses >= 3) w = 0.15;
    else if (amenorrheaMeses >= 1) w = 0.08;

    if (w > 0) {
      totalScore += w;
      features.push({
        feature: 'amenorrhea',
        weight: w,
        evidence: `${amenorrheaMeses} meses sin menstruar`,
      });
    }
  }

  // Componente 4: PSQI sueño
  const psqi = extractLatestObservation(bundle.observations, '72133-2');
  if (psqi !== null && psqi > 5) {
    const w = Math.min((psqi - 5) / 16, 1) * 0.1;
    totalScore += w;
    features.push({
      feature: 'sueno-alterado',
      weight: w,
      evidence: `PSQI ${psqi} (umbral > 5)`,
    });
  }

  // Componente 5: mood/cognitivo
  const cognitivoScore = extractQuestionnaireScore(
    bundle.questionnaireResponses,
    DIAGNOSTICO_BIOTERRAIN_URL,
    'sintoma-cognitivo',
  );
  const moodScore = extractQuestionnaireScore(
    bundle.questionnaireResponses,
    DIAGNOSTICO_BIOTERRAIN_URL,
    'sintoma-mood',
  );
  if (cognitivoScore !== null || moodScore !== null) {
    const combined = Math.max(cognitivoScore ?? 0, moodScore ?? 0);
    if (combined >= 2) {
      const w = Math.min(combined / 7, 1) * 0.1;
      totalScore += w;
      features.push({
        feature: 'sintomas-cognitivo-mood',
        weight: w,
        evidence: `cognitivo ${cognitivoScore ?? '-'}, mood ${moodScore ?? '-'}`,
      });
    }
  }

  return {
    profile: 'menopausia',
    score: clamp(totalScore, 0, 1),
    features,
  };
}
