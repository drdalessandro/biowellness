/**
 * BIOWELLNESS Decision Logic — Shared Types
 *
 * Library version: 0.2.0
 */

import type {
  Patient,
  Observation,
  QuestionnaireResponse,
  Condition,
} from '@medplum/fhirtypes';

export interface PatientClinicalBundle {
  patient: Patient;
  observations: Observation[];
  questionnaireResponses: QuestionnaireResponse[];
  conditions: Condition[];
}

export interface ProfileScore {
  profile: ProfileCode;
  score: number;
  features: FeatureContribution[];
}

export type ProfileCode =
  | 'menopausia'
  | 'longevidad-biohacking'
  | 'estetica-regenerativa'
  | 'deporte-running'
  | 'cardio-metabolico'
  | 'generico';

export interface FeatureContribution {
  feature: string;
  weight: number;
  evidence: string;
}

export interface ProfileSelection {
  primary: ProfileCode;
  secondary: ProfileCode | null;
  marginal: ProfileCode | null;
  rationale: string;
  scores: ProfileScore[];
  confidence: number;
}
