/**
 * BIOWELLNESS evaluate-fenotipo Bot
 *
 * Asigna el perfil clínico dominante de un paciente mediante un algoritmo
 * de 3 capas con human-in-the-loop:
 *
 *   Layer 1 (rules):  runLayer1Scoring() — funciones TS deterministas (RC1)
 *   Layer 2 (LLM):    STUB por ahora. Si confidence < umbral, marca para
 *                     revisión extra sin llamar al LLM. Se activará después.
 *   Layer 3 (human):  SIEMPRE postea un Task para que un médico confirme.
 *                     La asignación nunca es automática — el humano decide.
 *
 * TRIGGER: Operation $evaluate-fenotipo (invocación explícita desde el chart).
 *   Input: Parameters con un patient reference, o directamente un Patient.
 *
 * Diseño: E8 (RC1). ADR-031 (médico del programa puede evaluar).
 *
 * Build: esbuild ESM + --external:@medplum/core --external:@medplum/fhirtypes
 *        Bundlea shared/decision-logic (las scoring functions).
 */

import {
  BotEvent,
  MedplumClient,
  createReference,
  getReferenceString,
} from '@medplum/core';
import type {
  Patient,
  Parameters,
  Observation,
  QuestionnaireResponse,
  Condition,
  Task,
  Provenance,
  Consent,
  Reference,
} from '@medplum/fhirtypes';
import { runLayer1Scoring } from '../../shared/decision-logic';
import type {
  PatientClinicalBundle,
  ProfileSelection,
} from '../../shared/decision-logic';

/** Umbral de confianza por debajo del cual se marca para revisión extra (futuro Layer 2 LLM). */
const LAYER2_THRESHOLD = 0.75;

const MASTER_CONSENT_CATEGORY = 'master-journey';
const PROFILE_CODESYSTEM =
  'https://biowellness.ar/fhir/CodeSystem/iscca-perfil-clinico';

export interface EvaluateFenotipoResult {
  patientId: string;
  primary: string;
  secondary: string | null;
  confidence: number;
  needsExtraReview: boolean;
  taskId?: string;
  observationId?: string;
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Patient | Parameters>,
): Promise<EvaluateFenotipoResult> {
  // ─── 1. Resolver el Patient del input ───────────────────────────
  const patient = await resolvePatient(medplum, event.input);
  if (!patient?.id) {
    throw new Error('No se pudo resolver el Patient del input');
  }
  const patientRef: Reference<Patient> = createReference(patient);
  console.log(`Evaluando fenotipo para ${getReferenceString(patient)}`);

  // ─── 2. Pre-flight: Master Consent activo ───────────────────────
  const hasConsent = await checkMasterConsent(medplum, patient.id);
  if (!hasConsent) {
    throw new Error(
      `Paciente ${patient.id} no tiene Master Consent activo. ` +
        `No se puede evaluar fenotipo sin consentimiento.`,
    );
  }

  // ─── 3. Construir el PatientClinicalBundle ──────────────────────
  const bundle = await buildClinicalBundle(medplum, patient);
  console.log(
    `Bundle: ${bundle.observations.length} obs, ` +
      `${bundle.questionnaireResponses.length} QRs, ` +
      `${bundle.conditions.length} conditions`,
  );

  // ─── 4. Layer 1: scoring determinista ───────────────────────────
  const selection: ProfileSelection = runLayer1Scoring(bundle);
  console.log(
    `Layer 1 → primary=${selection.primary} ` +
      `confidence=${selection.confidence.toFixed(2)} ` +
      `(secondary=${selection.secondary ?? 'none'})`,
  );

  // ─── 5. Layer 2: STUB (sin LLM por ahora) ───────────────────────
  const needsExtraReview = selection.confidence < LAYER2_THRESHOLD;
  if (needsExtraReview) {
    console.log(
      `Confidence ${selection.confidence.toFixed(2)} < ${LAYER2_THRESHOLD} → ` +
        `marcado para revisión extra (Layer 2 LLM pendiente de activar)`,
    );
  }

  // ─── 6. Guardar el resultado provisional como Observation ───────
  const fenotipoObs = await medplum.createResource<Observation>({
    resourceType: 'Observation',
    status: 'preliminary',
    category: [
      {
        coding: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'survey',
            display: 'Survey',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'https://biowellness.ar/fhir/CodeSystem/observation-type',
          code: 'fenotipo-provisional',
          display: 'Perfil clínico provisional (Layer 1)',
        },
      ],
      text: 'Perfil clínico provisional',
    },
    subject: patientRef,
    effectiveDateTime: new Date().toISOString(),
    valueCodeableConcept: {
      coding: [
        {
          system: PROFILE_CODESYSTEM,
          code: selection.primary,
          display: selection.primary,
        },
      ],
    },
    component: buildScoreComponents(selection),
    note: [
      {
        text:
          `${selection.rationale}. Confidence: ${selection.confidence.toFixed(2)}.` +
          (needsExtraReview ? ' REQUIERE REVISIÓN EXTRA (baja confianza).' : ''),
      },
    ],
  });

  // ─── 7. Layer 3: Task para confirmación médica (SIEMPRE) ────────
  const task = await medplum.createResource<Task>({
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    priority: needsExtraReview ? 'urgent' : 'routine',
    code: {
      coding: [
        {
          system: 'https://biowellness.ar/fhir/CodeSystem/task-type',
          code: 'confirm-perfil-clinico',
          display: 'Confirmar perfil clínico asignado',
        },
      ],
    },
    description:
      `Confirmar perfil clínico para el paciente. ` +
      `Layer 1 sugiere: ${selection.primary}` +
      (selection.secondary ? ` (secundario: ${selection.secondary})` : '') +
      `. Confianza: ${selection.confidence.toFixed(2)}.` +
      (needsExtraReview
        ? ' ⚠️ Baja confianza — revisar con atención.'
        : ''),
    for: patientRef,
    focus: createReference(fenotipoObs),
    authoredOn: new Date().toISOString(),
  });

  // ─── 8. Provenance ──────────────────────────────────────────────
  await medplum.createResource<Provenance>({
    resourceType: 'Provenance',
    target: [createReference(fenotipoObs), createReference(task)],
    recorded: new Date().toISOString(),
    activity: {
      coding: [
        {
          system:
            'http://terminology.hl7.org/CodeSystem/v3-DataOperation',
          code: 'CREATE',
          display: 'create',
        },
      ],
    },
    agent: [
      {
        type: {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/provenance-participant-type',
              code: 'assembler',
            },
          ],
        },
        who: { display: 'Bot evaluate-fenotipo' },
      },
    ],
  });

  console.log(
    `✓ Fenotipo provisional ${selection.primary} guardado. ` +
      `Task ${task.id} creado para confirmación médica.`,
  );

  return {
    patientId: patient.id,
    primary: selection.primary,
    secondary: selection.secondary,
    confidence: selection.confidence,
    needsExtraReview,
    taskId: task.id,
    observationId: fenotipoObs.id,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Resuelve el Patient desde el input (Patient directo o Parameters con reference). */
async function resolvePatient(
  medplum: MedplumClient,
  input: Patient | Parameters,
): Promise<Patient | undefined> {
  if (input.resourceType === 'Patient') {
    return input;
  }
  if (input.resourceType === 'Parameters') {
    const param = input.parameter?.find(
      (p) => p.name === 'patient' || p.name === 'subject',
    );
    const ref = param?.valueReference?.reference;
    if (ref) {
      const id = ref.split('/')[1];
      return medplum.readResource('Patient', id);
    }
    // También aceptar valueString con el id
    const idString = param?.valueString;
    if (idString) {
      return medplum.readResource('Patient', idString);
    }
  }
  return undefined;
}

/** Verifica que el paciente tenga un Master Consent activo. */
async function checkMasterConsent(
  medplum: MedplumClient,
  patientId: string,
): Promise<boolean> {
  const patientRef = `Patient/${patientId}`;
  // Buscamos por patient; si el backend filtra bien, ideal. Filtramos en código
  // de todas formas para ser robustos ante diferencias de indexación.
  let consents = await medplum.searchResources('Consent', {
    patient: patientRef,
    _count: '100',
  });
  // Fallback: si el search param no filtró (devolvió 0 pero puede haber consents),
  // traer todos y filtrar en código.
  if (consents.length === 0) {
    consents = await medplum.searchResources('Consent', { _count: '100' });
  }
  return consents.some(
    (c: Consent) =>
      c.status === 'active' &&
      c.patient?.reference === patientRef &&
      c.category?.some((cat) =>
        cat.coding?.some((code) => code.code === MASTER_CONSENT_CATEGORY),
      ),
  );
}

/** Construye el PatientClinicalBundle consultando Medplum. */
async function buildClinicalBundle(
  medplum: MedplumClient,
  patient: Patient,
): Promise<PatientClinicalBundle> {
  const patientRef = `Patient/${patient.id}`;

  const [observations, questionnaireResponses, conditions] = await Promise.all([
    medplum.searchResources('Observation', {
      subject: patientRef,
      _count: '100',
      _sort: '-date',
    }),
    medplum.searchResources('QuestionnaireResponse', {
      subject: patientRef,
      _count: '50',
      _sort: '-authored',
    }),
    medplum.searchResources('Condition', {
      subject: patientRef,
      _count: '100',
    }),
  ]);

  return {
    patient,
    observations: observations as Observation[],
    questionnaireResponses: questionnaireResponses as QuestionnaireResponse[],
    conditions: conditions as Condition[],
  };
}

/** Convierte los scores de cada perfil en components de la Observation. */
function buildScoreComponents(selection: ProfileSelection) {
  return selection.scores
    .filter((s) => s.score > 0)
    .map((s) => ({
      code: {
        coding: [
          {
            system: PROFILE_CODESYSTEM,
            code: s.profile,
            display: s.profile,
          },
        ],
      },
      valueQuantity: {
        value: Math.round(s.score * 100) / 100,
        unit: 'score',
        system: 'http://unitsofmeasure.org',
        code: '1',
      },
    }));
}
