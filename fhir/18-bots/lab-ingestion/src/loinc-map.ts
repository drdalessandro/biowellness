/**
 * BIOWELLNESS lab-ingestion — LOINC mapping
 *
 * Mapea los linkId del Questionnaire q-lab-panel-basico a:
 *  - LOINC code (estándar internacional para identificar la prueba)
 *  - unidad UCUM
 *  - display name legible
 *
 * Diseño: agnóstico de la fuente. El mismo mapa sirve para:
 *  - QuestionnaireResponse manual (médica carga en chart) — MVP
 *  - QuestionnaireResponse del portal paciente (foomedical fork) — V2
 *
 * Para agregar un biomarker nuevo: agregar entry acá + item en el Questionnaire
 * + (opcional) ObservationDefinition con qualifiedInterval para evaluación de rangos.
 */

export interface LoincMapping {
  loinc: string;
  unit: string;
  unitSystem: string;
  display: string;
}

/**
 * linkId del Questionnaire → metadata LOINC.
 * Los 8 biomarkers con ObservationDefinition deployada + básicos comunes.
 */
export const LOINC_MAP: Record<string, LoincMapping> = {
  // ─── Biomarkers con ObservationDefinition deployada ───────────────
  'hba1c': {
    loinc: '4548-4',
    unit: '%',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Hemoglobina glicosilada A1c',
  },
  'lipoproteina-a': {
    loinc: '10835-7',
    unit: 'mg/dL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Lipoproteína(a)',
  },
  'homocisteina': {
    loinc: '13965-9',
    unit: 'umol/L',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Homocisteína',
  },
  'igf-1': {
    loinc: '2484-4',
    unit: 'ng/mL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'IGF-1',
  },
  'dhea-s': {
    loinc: '2191-5',
    unit: 'ug/dL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'DHEA-S',
  },
  'acido-urico': {
    loinc: '3084-1',
    unit: 'mg/dL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Ácido úrico',
  },
  'cortisol-matutino': {
    loinc: '2143-6',
    unit: 'ug/dL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Cortisol matutino',
  },
  'testosterona-total': {
    loinc: '2986-8',
    unit: 'ng/dL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Testosterona total',
  },

  // ─── Panel metabólico básico (sin OD aún, evaluación por umbrales) ─
  'glucosa': {
    loinc: '2345-7',
    unit: 'mg/dL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Glucosa en ayunas',
  },
  'insulina': {
    loinc: '20448-7',
    unit: 'uIU/mL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Insulina basal',
  },
  'homa-ir': {
    loinc: '88110-5',
    unit: '1',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'HOMA-IR',
  },
  'colesterol-total': {
    loinc: '2093-3',
    unit: 'mg/dL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Colesterol total',
  },
  'ldl': {
    loinc: '18262-6',
    unit: 'mg/dL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Colesterol LDL',
  },
  'hdl': {
    loinc: '2085-9',
    unit: 'mg/dL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Colesterol HDL',
  },
  'trigliceridos': {
    loinc: '2571-8',
    unit: 'mg/dL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Triglicéridos',
  },
  'hs-crp': {
    loinc: '30522-7',
    unit: 'mg/L',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Proteína C reactiva ultrasensible',
  },
  'creatinina': {
    loinc: '2160-0',
    unit: 'mg/dL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Creatinina sérica',
  },
  'tsh': {
    loinc: '3016-3',
    unit: 'mIU/L',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'TSH',
  },
  'vitamina-d': {
    loinc: '1989-3',
    unit: 'ng/mL',
    unitSystem: 'http://unitsofmeasure.org',
    display: 'Vitamina D (25-OH)',
  },
};

/** Devuelve el mapping para un linkId, o undefined si no está mapeado. */
export function getLoincMapping(linkId: string): LoincMapping | undefined {
  return LOINC_MAP[linkId];
}
