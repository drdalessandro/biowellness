// src/index.ts
import {
  createReference,
  getReferenceString
} from "@medplum/core";

// ../shared/decision-logic/helpers.ts
function computeAge(birthDate) {
  if (!birthDate)
    return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime()))
    return null;
  const now = /* @__PURE__ */ new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || monthDiff === 0 && now.getDate() < birth.getDate()) {
    age--;
  }
  return age;
}
function extractLatestObservation(observations, loincCode) {
  const matching = observations.filter(
    (o) => o.code?.coding?.some(
      (c) => c.system === "http://loinc.org" && c.code === loincCode
    )
  ).filter((o) => o.valueQuantity?.value !== void 0).sort(
    (a, b) => (b.effectiveDateTime ?? "").localeCompare(a.effectiveDateTime ?? "")
  );
  return matching[0]?.valueQuantity?.value ?? null;
}
function extractQuestionnaireScore(responses, questionnaireUrl, linkId) {
  const qr = responses.find(
    (r) => r.questionnaire === questionnaireUrl || r.questionnaire?.endsWith(`/${questionnaireUrl}`)
  );
  if (!qr)
    return null;
  const item = findItem(qr.item ?? [], linkId);
  const value = item?.answer?.[0];
  if (value?.valueInteger !== void 0)
    return value.valueInteger;
  if (value?.valueDecimal !== void 0)
    return value.valueDecimal;
  if (value?.valueQuantity?.value !== void 0)
    return value.valueQuantity.value;
  return null;
}
function findItem(items, linkId) {
  for (const item of items) {
    if (item.linkId === linkId)
      return item;
    if (item.item) {
      const nested = findItem(item.item, linkId);
      if (nested)
        return nested;
    }
  }
  return void 0;
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ../shared/decision-logic/score-menopausia.ts
var DIAGNOSTICO_BIOTERRAIN_URL = "https://biowellness.ar/fhir/Questionnaire/q-diagnostico-bioterrain";
function scoreMenopausia(bundle) {
  const features = [];
  let totalScore = 0;
  if (bundle.patient.gender !== "female") {
    return {
      profile: "menopausia",
      score: 0,
      features: [{ feature: "genero-no-femenino", weight: -1, evidence: "excluyente" }]
    };
  }
  const age = computeAge(bundle.patient.birthDate);
  if (age === null || age < 35 || age > 65) {
    return {
      profile: "menopausia",
      score: 0,
      features: [{ feature: "edad-fuera-rango", weight: -1, evidence: `edad ${age ?? "desconocida"}` }]
    };
  }
  const sigma = 7;
  const peak = 0.25;
  const edadWeight = peak * Math.exp(-((age - 48) ** 2) / (2 * sigma * sigma));
  totalScore += edadWeight;
  features.push({
    feature: "edad-perimenopausica",
    weight: edadWeight,
    evidence: `${age} a\xF1os (peak 45-52)`
  });
  const vasomotorScore = extractQuestionnaireScore(
    bundle.questionnaireResponses,
    DIAGNOSTICO_BIOTERRAIN_URL,
    "sintoma-vasomotor"
  );
  if (vasomotorScore !== null && vasomotorScore >= 2) {
    const w = Math.min(vasomotorScore / 7, 1) * 0.3;
    totalScore += w;
    features.push({
      feature: "sintomas-vasomotores",
      weight: w,
      evidence: `score vasomotor ${vasomotorScore}/7`
    });
  }
  const amenorrheaMeses = extractQuestionnaireScore(
    bundle.questionnaireResponses,
    DIAGNOSTICO_BIOTERRAIN_URL,
    "amenorrhea-meses"
  );
  if (amenorrheaMeses !== null) {
    let w = 0;
    if (amenorrheaMeses >= 12)
      w = 0.2;
    else if (amenorrheaMeses >= 3)
      w = 0.15;
    else if (amenorrheaMeses >= 1)
      w = 0.08;
    if (w > 0) {
      totalScore += w;
      features.push({
        feature: "amenorrhea",
        weight: w,
        evidence: `${amenorrheaMeses} meses sin menstruar`
      });
    }
  }
  const psqi = extractLatestObservation(bundle.observations, "72133-2");
  if (psqi !== null && psqi > 5) {
    const w = Math.min((psqi - 5) / 16, 1) * 0.1;
    totalScore += w;
    features.push({
      feature: "sueno-alterado",
      weight: w,
      evidence: `PSQI ${psqi} (umbral > 5)`
    });
  }
  const cognitivoScore = extractQuestionnaireScore(
    bundle.questionnaireResponses,
    DIAGNOSTICO_BIOTERRAIN_URL,
    "sintoma-cognitivo"
  );
  const moodScore = extractQuestionnaireScore(
    bundle.questionnaireResponses,
    DIAGNOSTICO_BIOTERRAIN_URL,
    "sintoma-mood"
  );
  if (cognitivoScore !== null || moodScore !== null) {
    const combined = Math.max(cognitivoScore ?? 0, moodScore ?? 0);
    if (combined >= 2) {
      const w = Math.min(combined / 7, 1) * 0.1;
      totalScore += w;
      features.push({
        feature: "sintomas-cognitivo-mood",
        weight: w,
        evidence: `cognitivo ${cognitivoScore ?? "-"}, mood ${moodScore ?? "-"}`
      });
    }
  }
  return {
    profile: "menopausia",
    score: clamp(totalScore, 0, 1),
    features
  };
}

// ../shared/decision-logic/score-cardio-metabolico.ts
var SNOMED_HTA_CODES = ["38341003", "59621000"];
var SNOMED_CV_EVENT_CODES = ["22298006", "194828000", "230690007", "57054005"];
function scoreCardioMetabolico(bundle) {
  const features = [];
  let totalScore = 0;
  const age = computeAge(bundle.patient.birthDate);
  if (age !== null && age < 25) {
    return {
      profile: "cardio-metabolico",
      score: 0,
      features: [{ feature: "edad-baja", weight: -1, evidence: `${age} a\xF1os < 25` }]
    };
  }
  const homa = extractLatestObservation(bundle.observations, "88110-5");
  if (homa !== null) {
    let w = 0;
    if (homa >= 5)
      w = 0.25;
    else if (homa >= 2.5)
      w = 0.2;
    else if (homa >= 2)
      w = 0.1;
    if (w > 0) {
      totalScore += w;
      features.push({
        feature: "resistencia-insulinica",
        weight: w,
        evidence: `HOMA-IR ${homa.toFixed(1)}`
      });
    }
  }
  const tgHdl = extractLatestObservation(bundle.observations, "9830-1");
  if (tgHdl !== null) {
    const threshold = bundle.patient.gender === "female" ? 1.5 : 2;
    if (tgHdl >= threshold) {
      const excess = tgHdl - threshold;
      const w = Math.min(excess / 2, 1) * 0.15;
      totalScore += w;
      features.push({
        feature: "dislipemia-aterogenica",
        weight: w,
        evidence: `TG/HDL ${tgHdl.toFixed(2)}`
      });
    }
  }
  const pcr = extractLatestObservation(bundle.observations, "30522-7");
  if (pcr !== null) {
    let w = 0;
    if (pcr >= 3 && pcr < 10)
      w = 0.1;
    else if (pcr >= 2 && pcr < 3)
      w = 0.05;
    if (w > 0) {
      totalScore += w;
      features.push({
        feature: "inflamacion-bajo-grado",
        weight: w,
        evidence: `PCR-us ${pcr.toFixed(2)} mg/L`
      });
    }
  }
  const hipertension = bundle.conditions.some(
    (c) => c.code?.coding?.some(
      (co) => co.system === "http://snomed.info/sct" && SNOMED_HTA_CODES.includes(co.code ?? "")
    )
  );
  if (hipertension) {
    const w = 0.15;
    totalScore += w;
    features.push({
      feature: "hipertension-diagnosticada",
      weight: w,
      evidence: "HTA en Condition"
    });
  }
  const cvHistory = bundle.conditions.some(
    (c) => c.code?.coding?.some(
      (co) => co.system === "http://snomed.info/sct" && SNOMED_CV_EVENT_CODES.includes(co.code ?? "")
    )
  );
  if (cvHistory) {
    const w = 0.2;
    totalScore += w;
    features.push({
      feature: "antecedente-cv",
      weight: w,
      evidence: "Condition con c\xF3digo CV"
    });
  }
  return {
    profile: "cardio-metabolico",
    score: clamp(totalScore, 0, 1),
    features
  };
}

// ../shared/decision-logic/score-longevidad-biohacking.ts
function scoreLongevidadBiohacking(_bundle) {
  return { profile: "longevidad-biohacking", score: 0, features: [{ feature: "unimplemented", weight: 0, evidence: "sem 2" }] };
}

// ../shared/decision-logic/score-estetica-regenerativa.ts
function scoreEsteticaRegenerativa(_bundle) {
  return { profile: "estetica-regenerativa", score: 0, features: [{ feature: "unimplemented", weight: 0, evidence: "sem 2" }] };
}

// ../shared/decision-logic/score-deporte-running.ts
function scoreDeporteRunning(_bundle) {
  return { profile: "deporte-running", score: 0, features: [{ feature: "unimplemented", weight: 0, evidence: "sem 2" }] };
}

// ../shared/decision-logic/compute-fenotipo-confidence.ts
function computeFenotipoConfidence(scores) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  if (sorted.length === 0 || sorted[0].score === 0)
    return 0;
  const top = sorted[0].score;
  const second = sorted[1]?.score ?? 0;
  const gap = top - second;
  const gapFactor = 0.5 + 0.5 * Math.tanh(gap * 5);
  const confidence = top * gapFactor;
  return Math.min(Math.max(confidence, 0), 1);
}

// ../shared/decision-logic/select-dominant-profile.ts
function selectDominantProfile(scores) {
  const nonZero = scores.filter((s) => s.score > 0);
  const confidence = computeFenotipoConfidence(scores);
  if (nonZero.length === 0) {
    return {
      primary: "generico",
      secondary: null,
      marginal: null,
      rationale: "Sin se\xF1al clara en ning\xFAn perfil. Journey exploratorio.",
      scores,
      confidence
    };
  }
  const sorted = [...nonZero].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const second = sorted[1];
  if (top.score < 0.3) {
    return {
      primary: "generico",
      secondary: null,
      marginal: null,
      rationale: `Top score ${top.profile} solo ${top.score.toFixed(2)} < 0.30.`,
      scores,
      confidence
    };
  }
  let secondary = null;
  let marginal = null;
  let rationale = `Perfil dominante: ${top.profile} (score ${top.score.toFixed(2)})`;
  if (second) {
    const gap = top.score - second.score;
    if (second.score >= 0.4 && gap < 0.2) {
      secondary = second.profile;
      rationale += `. Secundario: ${secondary} (gap ${gap.toFixed(2)})`;
    } else if (second.score >= 0.3 && gap < 0.1) {
      marginal = second.profile;
      rationale += `. Marginal: ${marginal}`;
    }
  }
  return {
    primary: top.profile,
    secondary,
    marginal,
    rationale,
    scores,
    confidence
  };
}

// ../shared/decision-logic/index.ts
function runLayer1Scoring(bundle) {
  const scores = [
    scoreMenopausia(bundle),
    scoreCardioMetabolico(bundle),
    scoreLongevidadBiohacking(bundle),
    scoreEsteticaRegenerativa(bundle),
    scoreDeporteRunning(bundle)
  ];
  return selectDominantProfile(scores);
}

// src/index.ts
var LAYER2_THRESHOLD = 0.75;
var MASTER_CONSENT_CATEGORY = "master-journey";
var PROFILE_CODESYSTEM = "https://biowellness.ar/fhir/CodeSystem/iscca-perfil-clinico";
async function handler(medplum, event) {
  const patient = await resolvePatient(medplum, event.input);
  if (!patient?.id) {
    throw new Error("No se pudo resolver el Patient del input");
  }
  const patientRef = createReference(patient);
  console.log(`Evaluando fenotipo para ${getReferenceString(patient)}`);
  const hasConsent = await checkMasterConsent(medplum, patient.id);
  if (!hasConsent) {
    throw new Error(
      `Paciente ${patient.id} no tiene Master Consent activo. No se puede evaluar fenotipo sin consentimiento.`
    );
  }
  const bundle = await buildClinicalBundle(medplum, patient);
  console.log(
    `Bundle: ${bundle.observations.length} obs, ${bundle.questionnaireResponses.length} QRs, ${bundle.conditions.length} conditions`
  );
  const selection = runLayer1Scoring(bundle);
  console.log(
    `Layer 1 \u2192 primary=${selection.primary} confidence=${selection.confidence.toFixed(2)} (secondary=${selection.secondary ?? "none"})`
  );
  const needsExtraReview = selection.confidence < LAYER2_THRESHOLD;
  if (needsExtraReview) {
    console.log(
      `Confidence ${selection.confidence.toFixed(2)} < ${LAYER2_THRESHOLD} \u2192 marcado para revisi\xF3n extra (Layer 2 LLM pendiente de activar)`
    );
  }
  const fenotipoObs = await medplum.createResource({
    resourceType: "Observation",
    status: "preliminary",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "survey",
            display: "Survey"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "https://biowellness.ar/fhir/CodeSystem/observation-type",
          code: "fenotipo-provisional",
          display: "Perfil cl\xEDnico provisional (Layer 1)"
        }
      ],
      text: "Perfil cl\xEDnico provisional"
    },
    subject: patientRef,
    effectiveDateTime: (/* @__PURE__ */ new Date()).toISOString(),
    valueCodeableConcept: {
      coding: [
        {
          system: PROFILE_CODESYSTEM,
          code: selection.primary,
          display: selection.primary
        }
      ]
    },
    component: buildScoreComponents(selection),
    note: [
      {
        text: `${selection.rationale}. Confidence: ${selection.confidence.toFixed(2)}.` + (needsExtraReview ? " REQUIERE REVISI\xD3N EXTRA (baja confianza)." : "")
      }
    ]
  });
  const task = await medplum.createResource({
    resourceType: "Task",
    status: "requested",
    intent: "order",
    priority: needsExtraReview ? "urgent" : "routine",
    code: {
      coding: [
        {
          system: "https://biowellness.ar/fhir/CodeSystem/task-type",
          code: "confirm-perfil-clinico",
          display: "Confirmar perfil cl\xEDnico asignado"
        }
      ]
    },
    description: `Confirmar perfil cl\xEDnico para el paciente. Layer 1 sugiere: ${selection.primary}` + (selection.secondary ? ` (secundario: ${selection.secondary})` : "") + `. Confianza: ${selection.confidence.toFixed(2)}.` + (needsExtraReview ? " \u26A0\uFE0F Baja confianza \u2014 revisar con atenci\xF3n." : ""),
    for: patientRef,
    focus: createReference(fenotipoObs),
    authoredOn: (/* @__PURE__ */ new Date()).toISOString()
  });
  await medplum.createResource({
    resourceType: "Provenance",
    target: [createReference(fenotipoObs), createReference(task)],
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
        who: { display: "Bot evaluate-fenotipo" }
      }
    ]
  });
  console.log(
    `\u2713 Fenotipo provisional ${selection.primary} guardado. Task ${task.id} creado para confirmaci\xF3n m\xE9dica.`
  );
  return {
    patientId: patient.id,
    primary: selection.primary,
    secondary: selection.secondary,
    confidence: selection.confidence,
    needsExtraReview,
    taskId: task.id,
    observationId: fenotipoObs.id
  };
}
async function resolvePatient(medplum, input) {
  if (input.resourceType === "Patient") {
    return input;
  }
  if (input.resourceType === "Parameters") {
    const param = input.parameter?.find(
      (p) => p.name === "patient" || p.name === "subject"
    );
    const ref = param?.valueReference?.reference;
    if (ref) {
      const id = ref.split("/")[1];
      return medplum.readResource("Patient", id);
    }
    const idString = param?.valueString;
    if (idString) {
      return medplum.readResource("Patient", idString);
    }
  }
  return void 0;
}
async function checkMasterConsent(medplum, patientId) {
  const patientRef = `Patient/${patientId}`;
  let consents = await medplum.searchResources("Consent", {
    patient: patientRef,
    _count: "100"
  });
  if (consents.length === 0) {
    consents = await medplum.searchResources("Consent", { _count: "100" });
  }
  return consents.some(
    (c) => c.status === "active" && c.patient?.reference === patientRef && c.category?.some(
      (cat) => cat.coding?.some((code) => code.code === MASTER_CONSENT_CATEGORY)
    )
  );
}
async function buildClinicalBundle(medplum, patient) {
  const patientRef = `Patient/${patient.id}`;
  const [observations, questionnaireResponses, conditions] = await Promise.all([
    medplum.searchResources("Observation", {
      subject: patientRef,
      _count: "100",
      _sort: "-date"
    }),
    medplum.searchResources("QuestionnaireResponse", {
      subject: patientRef,
      _count: "50",
      _sort: "-authored"
    }),
    medplum.searchResources("Condition", {
      subject: patientRef,
      _count: "100"
    })
  ]);
  return {
    patient,
    observations,
    questionnaireResponses,
    conditions
  };
}
function buildScoreComponents(selection) {
  return selection.scores.filter((s) => s.score > 0).map((s) => ({
    code: {
      coding: [
        {
          system: PROFILE_CODESYSTEM,
          code: s.profile,
          display: s.profile
        }
      ]
    },
    valueQuantity: {
      value: Math.round(s.score * 100) / 100,
      unit: "score",
      system: "http://unitsofmeasure.org",
      code: "1"
    }
  }));
}
export {
  handler
};
