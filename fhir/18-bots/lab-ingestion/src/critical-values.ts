/**
 * BIOWELLNESS lab-ingestion — Valores críticos
 *
 * Define umbrales de seguridad que, al superarse, disparan un Task urgente
 * para revisión médica inmediata + pausan intervenciones de alta intensidad.
 *
 * Estos son umbrales de SEGURIDAD (no de optimización). Son conservadores y
 * universales — independientes del perfil clínico del paciente. La evaluación
 * fina de rangos óptimos vs. de referencia la hace el matching contra
 * ObservationDefinition.qualifiedInterval (ver index.ts).
 *
 * IMPORTANTE: estos umbrales deben ser validados por el equipo médico
 * (Conrado + Stephanie + Alejandro) antes del go-live. Valores iniciales
 * basados en literatura estándar de valores de pánico de laboratorio.
 */

export interface CriticalThreshold {
  /** Si el valor es >= criticalHigh → crítico alto */
  criticalHigh?: number;
  /** Si el valor es <= criticalLow → crítico bajo */
  criticalLow?: number;
  /** Mensaje para el Task urgente */
  message: string;
}

/** linkId → umbral crítico. Solo los biomarkers con riesgo agudo. */
export const CRITICAL_THRESHOLDS: Record<string, CriticalThreshold> = {
  'glucosa': {
    criticalHigh: 250,
    criticalLow: 50,
    message: 'Glucosa en rango crítico — evaluar descompensación metabólica',
  },
  'hba1c': {
    criticalHigh: 9.0,
    message: 'HbA1c muy elevada (>9%) — posible diabetes no controlada, requiere evaluación',
  },
  'hs-crp': {
    criticalHigh: 10,
    message: 'PCR-us elevada (>10 mg/L) — proceso inflamatorio agudo, contraindicación temporal para terapias de hormesis',
  },
  'creatinina': {
    criticalHigh: 2.0,
    message: 'Creatinina elevada — posible deterioro renal, revisar antes de terapias IV',
  },
  'trigliceridos': {
    criticalHigh: 500,
    message: 'Triglicéridos muy elevados (>500) — riesgo de pancreatitis, requiere manejo',
  },
  'testosterona-total': {
    criticalLow: 100,
    message: 'Testosterona muy baja — evaluar hipogonadismo (si paciente masculino)',
  },
  'cortisol-matutino': {
    criticalHigh: 30,
    criticalLow: 3,
    message: 'Cortisol matutino fuera de rango crítico — evaluar eje adrenal',
  },
};

export type CriticalEvaluation =
  | { critical: false }
  | { critical: true; direction: 'high' | 'low'; message: string };

/** Evalúa si un valor cruza un umbral crítico. */
export function evaluateCritical(
  linkId: string,
  value: number,
): CriticalEvaluation {
  const threshold = CRITICAL_THRESHOLDS[linkId];
  if (!threshold) return { critical: false };

  if (threshold.criticalHigh !== undefined && value >= threshold.criticalHigh) {
    return { critical: true, direction: 'high', message: threshold.message };
  }
  if (threshold.criticalLow !== undefined && value <= threshold.criticalLow) {
    return { critical: true, direction: 'low', message: threshold.message };
  }
  return { critical: false };
}
