/**
 * BIOWELLNESS lab-ingestion Bot
 *
 * Convierte un QuestionnaireResponse de carga de laboratorio en recursos FHIR:
 *  - Observation (una por biomarker cargado, con LOINC + interpretation)
 *  - DiagnosticReport (agrupa todas las Observations del panel)
 *  - Task urgente (si hay valores críticos)
 *  - Provenance (auditoría)
 *
 * Todo en una transacción atómica (Bundle) para consistencia clínica.
 *
 * TRIGGER: Subscription sobre QuestionnaireResponse?questionnaire=q-lab-panel-basico&status=completed
 *
 * FUENTE AGNÓSTICA: procesa QuestionnaireResponse venga de donde venga —
 *  chart médico (MVP) o portal paciente foomedical (V2). Mismo código.
 *
 * Diseño: E7 (RC1). ADR-022 (transacción atómica writes).
 */

import { BotEvent, MedplumClient, createReference, getReferenceString } from '@medplum/core';
import type {
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  Observation,
  DiagnosticReport,
  Task,
  Provenance,
  Bundle,
  BundleEntry,
  Reference,
  Patient,
  ObservationDefinition,
} from '@medplum/fhirtypes';
import { getLoincMapping } from './loinc-map';
import { evaluateCritical } from './critical-values';

const QUESTIONNAIRE_URL = 'https://biowellness.ar/fhir/Questionnaire/q-lab-panel-basico';

interface ParsedValue {
  linkId: string;
  value: number;
  loinc: string;
  unit: string;
  unitSystem: string;
  display: string;
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<QuestionnaireResponse>,
): Promise<{ created: number; critical: number; reportId?: string }> {
  const qr = event.input;

  // ─── 1. Pre-flight ──────────────────────────────────────────────
  if (qr.resourceType !== 'QuestionnaireResponse') {
    throw new Error(`Expected QuestionnaireResponse, got ${(qr as any).resourceType}`);
  }

  const isLabPanel =
    qr.questionnaire === QUESTIONNAIRE_URL ||
    qr.questionnaire?.includes('q-lab-panel-basico');
  if (!isLabPanel) {
    console.log(`Skipping: not a lab panel (questionnaire=${qr.questionnaire})`);
    return { created: 0, critical: 0 };
  }

  if (qr.status !== 'completed' && qr.status !== 'amended') {
    console.log(`Skipping: status is ${qr.status}, not completed/amended`);
    return { created: 0, critical: 0 };
  }

  const patientRef = qr.subject;
  if (!patientRef?.reference) {
    throw new Error('QuestionnaireResponse has no subject (patient) reference');
  }

  // effectiveDateTime: usar authored del QR, o ahora
  const effective = qr.authored ?? new Date().toISOString();

  // ─── 2. Parsear valores del QuestionnaireResponse ───────────────
  const parsed = parseValues(qr.item ?? []);
  if (parsed.length === 0) {
    console.log('No mapped lab values found in QuestionnaireResponse');
    return { created: 0, critical: 0 };
  }

  console.log(`Parsed ${parsed.length} lab values for patient ${patientRef.reference}`);

  // ─── 3. Construir Observations + detectar críticos ──────────────
  const observations: Observation[] = [];
  const criticalFindings: { display: string; value: number; message: string }[] = [];

  for (const p of parsed) {
    // Evaluar interpretación contra ObservationDefinition (si existe)
    const interpretation = await evaluateInterpretation(medplum, p);

    // Evaluar crítico (umbrales de seguridad)
    const crit = evaluateCritical(p.linkId, p.value);

    const obs: Observation = {
      resourceType: 'Observation',
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'laboratory',
              display: 'Laboratory',
            },
          ],
        },
      ],
      code: {
        coding: [{ system: 'http://loinc.org', code: p.loinc, display: p.display }],
        text: p.display,
      },
      subject: patientRef,
      effectiveDateTime: effective,
      valueQuantity: {
        value: p.value,
        unit: p.unit,
        system: p.unitSystem,
        code: p.unit,
      },
      derivedFrom: [createReference(qr)],
    };

    if (interpretation) {
      obs.interpretation = [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
              code: interpretation.code,
              display: interpretation.display,
            },
          ],
        },
      ];
    }

    if (crit.critical) {
      // Marcar la Observation como crítica también
      obs.interpretation = [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
              code: crit.direction === 'high' ? 'HH' : 'LL',
              display: crit.direction === 'high' ? 'Critical high' : 'Critical low',
            },
          ],
        },
      ];
      criticalFindings.push({ display: p.display, value: p.value, message: crit.message });
    }

    observations.push(obs);
  }

  // ─── 4. Construir transacción atómica ───────────────────────────
  const entries: BundleEntry[] = [];

  // Observations (POST, ids asignados por server con urn:uuid placeholders)
  const obsUrns: string[] = [];
  observations.forEach((obs, i) => {
    const urn = `urn:uuid:obs-${i}`;
    obsUrns.push(urn);
    entries.push({
      fullUrl: urn,
      resource: obs,
      request: { method: 'POST', url: 'Observation' },
    });
  });

  // DiagnosticReport agrupando las Observations
  const reportUrn = 'urn:uuid:report';
  const report: DiagnosticReport = {
    resourceType: 'DiagnosticReport',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: 'LAB',
            display: 'Laboratory',
          },
        ],
      },
    ],
    code: {
      coding: [{ system: 'http://loinc.org', code: '11502-2', display: 'Laboratory report' }],
      text: 'Panel de laboratorio BIOWELLNESS',
    },
    subject: patientRef,
    effectiveDateTime: effective,
    issued: new Date().toISOString(),
    result: obsUrns.map((urn) => ({ reference: urn })),
  };
  entries.push({
    fullUrl: reportUrn,
    resource: report,
    request: { method: 'POST', url: 'DiagnosticReport' },
  });

  // Task urgente si hay críticos
  if (criticalFindings.length > 0) {
    const task: Task = {
      resourceType: 'Task',
      status: 'requested',
      intent: 'order',
      priority: 'urgent',
      code: {
        coding: [
          {
            system: 'https://biowellness.ar/fhir/CodeSystem/task-type',
            code: 'critical-lab-review',
            display: 'Revisión urgente de laboratorio crítico',
          },
        ],
      },
      description:
        `Valores críticos detectados: ` +
        criticalFindings
          .map((f) => `${f.display}=${f.value} (${f.message})`)
          .join('; '),
      for: patientRef,
      focus: { reference: reportUrn },
      authoredOn: new Date().toISOString(),
    };
    entries.push({
      resource: task,
      request: { method: 'POST', url: 'Task' },
    });
  }

  // Provenance (auditoría)
  const provenance: Provenance = {
    resourceType: 'Provenance',
    target: [{ reference: reportUrn }, ...obsUrns.map((urn) => ({ reference: urn }))],
    recorded: new Date().toISOString(),
    activity: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-DataOperation',
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
              system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type',
              code: 'assembler',
            },
          ],
        },
        who: { display: 'Bot lab-ingestion' },
      },
    ],
    entity: [
      {
        role: 'source',
        what: createReference(qr),
      },
    ],
  };
  entries.push({
    resource: provenance,
    request: { method: 'POST', url: 'Provenance' },
  });

  // ─── 5. Ejecutar transacción ────────────────────────────────────
  const txBundle: Bundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: entries,
  };

  const result = await medplum.executeBatch(txBundle);

  // Extraer el id real del DiagnosticReport creado
  const reportEntry = result.entry?.find(
    (e) => e.response?.location?.startsWith('DiagnosticReport'),
  );
  const reportId = reportEntry?.response?.location?.split('/')[1];

  console.log(
    `✓ Created ${observations.length} Observations, 1 DiagnosticReport` +
      (criticalFindings.length > 0 ? `, 1 urgent Task (${criticalFindings.length} critical values)` : ''),
  );

  return {
    created: observations.length,
    critical: criticalFindings.length,
    reportId,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Recorre los items del QR (incluyendo anidados) y extrae valores mapeados. */
function parseValues(items: QuestionnaireResponseItem[]): ParsedValue[] {
  const results: ParsedValue[] = [];

  const walk = (itemList: QuestionnaireResponseItem[]): void => {
    for (const item of itemList) {
      if (item.item) walk(item.item);

      const answer = item.answer?.[0];
      if (!answer) continue;

      const value =
        answer.valueDecimal ??
        answer.valueInteger ??
        answer.valueQuantity?.value;
      if (value === undefined || value === null) continue;

      const mapping = getLoincMapping(item.linkId);
      if (!mapping) continue; // linkId no mapeado, saltear

      results.push({
        linkId: item.linkId,
        value,
        loinc: mapping.loinc,
        unit: mapping.unit,
        unitSystem: mapping.unitSystem,
        display: mapping.display,
      });
    }
  };

  walk(items);
  return results;
}

interface InterpretationResult {
  code: string; // N, H, L
  display: string;
}

/**
 * Evalúa el valor contra la ObservationDefinition.qualifiedInterval
 * (context = lab-reference) para asignar interpretación normal/alto/bajo.
 * Si no hay OD para ese LOINC, devuelve null (sin interpretación).
 */
async function evaluateInterpretation(
  medplum: MedplumClient,
  p: ParsedValue,
): Promise<InterpretationResult | null> {
  try {
    const ods = await medplum.searchResources('ObservationDefinition', {
      // Medplum no indexa OD por LOINC por default; buscamos todas y filtramos.
      // Para MVP el volumen de ODs es bajo (~8), aceptable.
      _count: '50',
    });

    const od = ods.find((o: ObservationDefinition) =>
      o.code?.coding?.some(
        (c) => c.system === 'http://loinc.org' && c.code === p.loinc,
      ),
    );
    if (!od?.qualifiedInterval) return null;

    const refInterval = od.qualifiedInterval.find((qi) =>
      qi.context?.coding?.some((c) => c.code === 'lab-reference'),
    );
    if (!refInterval?.range) return null;

    const low = refInterval.range.low?.value;
    const high = refInterval.range.high?.value;

    if (high !== undefined && p.value > high) {
      return { code: 'H', display: 'High' };
    }
    if (low !== undefined && p.value < low) {
      return { code: 'L', display: 'Low' };
    }
    return { code: 'N', display: 'Normal' };
  } catch (err) {
    console.log(`Could not evaluate interpretation for ${p.loinc}: ${err}`);
    return null;
  }
}
