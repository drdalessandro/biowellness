// src/index.ts
import { createReference } from "@medplum/core";

// src/loinc-map.ts
var LOINC_MAP = {
  // ─── Biomarkers con ObservationDefinition deployada ───────────────
  "hba1c": {
    loinc: "4548-4",
    unit: "%",
    unitSystem: "http://unitsofmeasure.org",
    display: "Hemoglobina glicosilada A1c"
  },
  "lipoproteina-a": {
    loinc: "10835-7",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Lipoprote\xEDna(a)"
  },
  "homocisteina": {
    loinc: "13965-9",
    unit: "umol/L",
    unitSystem: "http://unitsofmeasure.org",
    display: "Homociste\xEDna"
  },
  "igf-1": {
    loinc: "2484-4",
    unit: "ng/mL",
    unitSystem: "http://unitsofmeasure.org",
    display: "IGF-1"
  },
  "dhea-s": {
    loinc: "2191-5",
    unit: "ug/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "DHEA-S"
  },
  "acido-urico": {
    loinc: "3084-1",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "\xC1cido \xFArico"
  },
  "cortisol-matutino": {
    loinc: "2143-6",
    unit: "ug/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Cortisol matutino"
  },
  "testosterona-total": {
    loinc: "2986-8",
    unit: "ng/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Testosterona total"
  },
  // ─── Panel metabólico básico (sin OD aún, evaluación por umbrales) ─
  "glucosa": {
    loinc: "2345-7",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Glucosa en ayunas"
  },
  "insulina": {
    loinc: "20448-7",
    unit: "uIU/mL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Insulina basal"
  },
  "homa-ir": {
    loinc: "88110-5",
    unit: "1",
    unitSystem: "http://unitsofmeasure.org",
    display: "HOMA-IR"
  },
  "colesterol-total": {
    loinc: "2093-3",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Colesterol total"
  },
  "ldl": {
    loinc: "18262-6",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Colesterol LDL"
  },
  "hdl": {
    loinc: "2085-9",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Colesterol HDL"
  },
  "trigliceridos": {
    loinc: "2571-8",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Triglic\xE9ridos"
  },
  "hs-crp": {
    loinc: "30522-7",
    unit: "mg/L",
    unitSystem: "http://unitsofmeasure.org",
    display: "Prote\xEDna C reactiva ultrasensible"
  },
  "creatinina": {
    loinc: "2160-0",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Creatinina s\xE9rica"
  },
  "tsh": {
    loinc: "3016-3",
    unit: "mIU/L",
    unitSystem: "http://unitsofmeasure.org",
    display: "TSH"
  },
  "vitamina-d": {
    loinc: "1989-3",
    unit: "ng/mL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Vitamina D (25-OH)"
  }
};
function getLoincMapping(linkId) {
  return LOINC_MAP[linkId];
}

// src/critical-values.ts
var CRITICAL_THRESHOLDS = {
  "glucosa": {
    criticalHigh: 250,
    criticalLow: 50,
    message: "Glucosa en rango cr\xEDtico \u2014 evaluar descompensaci\xF3n metab\xF3lica"
  },
  "hba1c": {
    criticalHigh: 9,
    message: "HbA1c muy elevada (>9%) \u2014 posible diabetes no controlada, requiere evaluaci\xF3n"
  },
  "hs-crp": {
    criticalHigh: 10,
    message: "PCR-us elevada (>10 mg/L) \u2014 proceso inflamatorio agudo, contraindicaci\xF3n temporal para terapias de hormesis"
  },
  "creatinina": {
    criticalHigh: 2,
    message: "Creatinina elevada \u2014 posible deterioro renal, revisar antes de terapias IV"
  },
  "trigliceridos": {
    criticalHigh: 500,
    message: "Triglic\xE9ridos muy elevados (>500) \u2014 riesgo de pancreatitis, requiere manejo"
  },
  "testosterona-total": {
    criticalLow: 100,
    message: "Testosterona muy baja \u2014 evaluar hipogonadismo (si paciente masculino)"
  },
  "cortisol-matutino": {
    criticalHigh: 30,
    criticalLow: 3,
    message: "Cortisol matutino fuera de rango cr\xEDtico \u2014 evaluar eje adrenal"
  }
};
function evaluateCritical(linkId, value) {
  const threshold = CRITICAL_THRESHOLDS[linkId];
  if (!threshold)
    return { critical: false };
  if (threshold.criticalHigh !== void 0 && value >= threshold.criticalHigh) {
    return { critical: true, direction: "high", message: threshold.message };
  }
  if (threshold.criticalLow !== void 0 && value <= threshold.criticalLow) {
    return { critical: true, direction: "low", message: threshold.message };
  }
  return { critical: false };
}

// src/index.ts
var QUESTIONNAIRE_URL = "https://biowellness.ar/fhir/Questionnaire/q-lab-panel-basico";
async function handler(medplum, event) {
  const qr = event.input;
  if (qr.resourceType !== "QuestionnaireResponse") {
    throw new Error(`Expected QuestionnaireResponse, got ${qr.resourceType}`);
  }
  const isLabPanel = qr.questionnaire === QUESTIONNAIRE_URL || qr.questionnaire?.includes("q-lab-panel-basico");
  if (!isLabPanel) {
    console.log(`Skipping: not a lab panel (questionnaire=${qr.questionnaire})`);
    return { created: 0, critical: 0 };
  }
  if (qr.status !== "completed" && qr.status !== "amended") {
    console.log(`Skipping: status is ${qr.status}, not completed/amended`);
    return { created: 0, critical: 0 };
  }
  const patientRef = qr.subject;
  if (!patientRef?.reference) {
    throw new Error("QuestionnaireResponse has no subject (patient) reference");
  }
  const effective = qr.authored ?? (/* @__PURE__ */ new Date()).toISOString();
  const parsed = parseValues(qr.item ?? []);
  if (parsed.length === 0) {
    console.log("No mapped lab values found in QuestionnaireResponse");
    return { created: 0, critical: 0 };
  }
  console.log(`Parsed ${parsed.length} lab values for patient ${patientRef.reference}`);
  const observations = [];
  const criticalFindings = [];
  for (const p of parsed) {
    const interpretation = await evaluateInterpretation(medplum, p);
    const crit = evaluateCritical(p.linkId, p.value);
    const obs = {
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "laboratory",
              display: "Laboratory"
            }
          ]
        }
      ],
      code: {
        coding: [{ system: "http://loinc.org", code: p.loinc, display: p.display }],
        text: p.display
      },
      subject: patientRef,
      effectiveDateTime: effective,
      valueQuantity: {
        value: p.value,
        unit: p.unit,
        system: p.unitSystem,
        code: p.unit
      },
      derivedFrom: [createReference(qr)]
    };
    if (interpretation) {
      obs.interpretation = [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
              code: interpretation.code,
              display: interpretation.display
            }
          ]
        }
      ];
    }
    if (crit.critical) {
      obs.interpretation = [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
              code: crit.direction === "high" ? "HH" : "LL",
              display: crit.direction === "high" ? "Critical high" : "Critical low"
            }
          ]
        }
      ];
      criticalFindings.push({ display: p.display, value: p.value, message: crit.message });
    }
    observations.push(obs);
  }
  const entries = [];
  const obsUrns = [];
  observations.forEach((obs, i) => {
    const urn = `urn:uuid:obs-${i}`;
    obsUrns.push(urn);
    entries.push({
      fullUrl: urn,
      resource: obs,
      request: { method: "POST", url: "Observation" }
    });
  });
  const reportUrn = "urn:uuid:report";
  const report = {
    resourceType: "DiagnosticReport",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0074",
            code: "LAB",
            display: "Laboratory"
          }
        ]
      }
    ],
    code: {
      coding: [{ system: "http://loinc.org", code: "11502-2", display: "Laboratory report" }],
      text: "Panel de laboratorio BIOWELLNESS"
    },
    subject: patientRef,
    effectiveDateTime: effective,
    issued: (/* @__PURE__ */ new Date()).toISOString(),
    result: obsUrns.map((urn) => ({ reference: urn }))
  };
  entries.push({
    fullUrl: reportUrn,
    resource: report,
    request: { method: "POST", url: "DiagnosticReport" }
  });
  if (criticalFindings.length > 0) {
    const task = {
      resourceType: "Task",
      status: "requested",
      intent: "order",
      priority: "urgent",
      code: {
        coding: [
          {
            system: "https://biowellness.ar/fhir/CodeSystem/task-type",
            code: "critical-lab-review",
            display: "Revisi\xF3n urgente de laboratorio cr\xEDtico"
          }
        ]
      },
      description: `Valores cr\xEDticos detectados: ` + criticalFindings.map((f) => `${f.display}=${f.value} (${f.message})`).join("; "),
      for: patientRef,
      focus: { reference: reportUrn },
      authoredOn: (/* @__PURE__ */ new Date()).toISOString()
    };
    entries.push({
      resource: task,
      request: { method: "POST", url: "Task" }
    });
  }
  const provenance = {
    resourceType: "Provenance",
    target: [{ reference: reportUrn }, ...obsUrns.map((urn) => ({ reference: urn }))],
    recorded: (/* @__PURE__ */ new Date()).toISOString(),
    activity: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
          code: "CREATE",
          display: "create"
        }
      ]
    },
    agent: [
      {
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
              code: "assembler"
            }
          ]
        },
        who: { display: "Bot lab-ingestion" }
      }
    ],
    entity: [
      {
        role: "source",
        what: createReference(qr)
      }
    ]
  };
  entries.push({
    resource: provenance,
    request: { method: "POST", url: "Provenance" }
  });
  const txBundle = {
    resourceType: "Bundle",
    type: "transaction",
    entry: entries
  };
  const result = await medplum.executeBatch(txBundle);
  const reportEntry = result.entry?.find(
    (e) => e.response?.location?.startsWith("DiagnosticReport")
  );
  const reportId = reportEntry?.response?.location?.split("/")[1];
  console.log(
    `\u2713 Created ${observations.length} Observations, 1 DiagnosticReport` + (criticalFindings.length > 0 ? `, 1 urgent Task (${criticalFindings.length} critical values)` : "")
  );
  return {
    created: observations.length,
    critical: criticalFindings.length,
    reportId
  };
}
function parseValues(items) {
  const results = [];
  const walk = (itemList) => {
    for (const item of itemList) {
      if (item.item)
        walk(item.item);
      const answer = item.answer?.[0];
      if (!answer)
        continue;
      const value = answer.valueDecimal ?? answer.valueInteger ?? answer.valueQuantity?.value;
      if (value === void 0 || value === null)
        continue;
      const mapping = getLoincMapping(item.linkId);
      if (!mapping)
        continue;
      results.push({
        linkId: item.linkId,
        value,
        loinc: mapping.loinc,
        unit: mapping.unit,
        unitSystem: mapping.unitSystem,
        display: mapping.display
      });
    }
  };
  walk(items);
  return results;
}
async function evaluateInterpretation(medplum, p) {
  try {
    const ods = await medplum.searchResources("ObservationDefinition", {
      // Medplum no indexa OD por LOINC por default; buscamos todas y filtramos.
      // Para MVP el volumen de ODs es bajo (~8), aceptable.
      _count: "50"
    });
    const od = ods.find(
      (o) => o.code?.coding?.some(
        (c) => c.system === "http://loinc.org" && c.code === p.loinc
      )
    );
    if (!od?.qualifiedInterval)
      return null;
    const refInterval = od.qualifiedInterval.find(
      (qi) => qi.context?.coding?.some((c) => c.code === "lab-reference")
    );
    if (!refInterval?.range)
      return null;
    const low = refInterval.range.low?.value;
    const high = refInterval.range.high?.value;
    if (high !== void 0 && p.value > high) {
      return { code: "H", display: "High" };
    }
    if (low !== void 0 && p.value < low) {
      return { code: "L", display: "Low" };
    }
    return { code: "N", display: "Normal" };
  } catch (err) {
    console.log(`Could not evaluate interpretation for ${p.loinc}: ${err}`);
    return null;
  }
}
export {
  handler
};
