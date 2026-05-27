// src/index.ts
import { getReferenceString as getReferenceString2 } from "@medplum/core";

// src/helpers/resolvers.ts
import { getReferenceString } from "@medplum/core";
async function resolvePatient(medplum, patient) {
  if (typeof patient === "string") {
    const id = patient.includes("/") ? patient.split("/").pop() : patient;
    return medplum.readResource("Patient", id);
  }
  return medplum.readReference(patient);
}
async function resolvePlanDefinition(medplum, combo) {
  const looksLikeUrl = combo.includes("://");
  if (!looksLikeUrl) {
    try {
      return await medplum.readResource("PlanDefinition", combo);
    } catch {
    }
    const byName = await medplum.searchOne("PlanDefinition", { name: combo });
    if (byName) {
      return byName;
    }
  }
  const url = combo.split("|")[0];
  const byUrl = await medplum.searchOne("PlanDefinition", { url });
  if (byUrl) {
    return byUrl;
  }
  throw new Error(`PlanDefinition not found for combo "${combo}"`);
}
async function resolveActivityDefinitions(medplum, plan) {
  const canonicals = collectCanonicals(plan.action);
  const map = /* @__PURE__ */ new Map();
  await Promise.all(
    [...canonicals].map(async (canonical) => {
      const ad = await resolveOneActivityDefinition(medplum, canonical);
      if (ad) {
        map.set(canonical, ad);
        if (ad.url) {
          map.set(ad.url, ad);
        }
        if (ad.id) {
          map.set(`ActivityDefinition/${ad.id}`, ad);
        }
      }
    })
  );
  return map;
}
async function resolveOneActivityDefinition(medplum, canonical) {
  if (canonical.startsWith("ActivityDefinition/")) {
    const id = canonical.split("/")[1];
    return medplum.readResource("ActivityDefinition", id).catch(() => void 0);
  }
  const url = canonical.split("|")[0];
  return medplum.searchOne("ActivityDefinition", { url }).catch(() => void 0);
}
function collectCanonicals(actions) {
  const set = /* @__PURE__ */ new Set();
  for (const a of actions ?? []) {
    if (a.definitionCanonical) {
      set.add(a.definitionCanonical);
    }
    if (a.action?.length) {
      for (const c of collectCanonicals(a.action)) {
        set.add(c);
      }
    }
  }
  return set;
}
async function resolveProfile(medplum, profile) {
  if (profile && typeof profile === "object" && "reference" in profile && profile.reference) {
    try {
      return await medplum.readReference(profile);
    } catch {
      return profile;
    }
  }
  return profile ?? {};
}
var OBSERVATION_TYPE_SYSTEM = "https://biowellness.ar/fhir/CodeSystem/observation-type";
var PERFIL_CLINICO_SYSTEM = "https://biowellness.ar/fhir/CodeSystem/iscca-perfil-clinico";
var CONFIRMED_CODE = "fenotipo-confirmado";
var PROVISIONAL_CODE = "fenotipo-provisional";
async function resolveConfirmedProfile(medplum, patient) {
  const results = await medplum.searchResources("Observation", {
    subject: getReferenceString(patient),
    status: "final",
    code: `${OBSERVATION_TYPE_SYSTEM}|${CONFIRMED_CODE}`,
    _sort: "-_lastUpdated",
    _count: "1"
  });
  return results[0];
}
async function hasProvisionalOnly(medplum, patient) {
  const provisional = await medplum.searchResources("Observation", {
    subject: getReferenceString(patient),
    code: `${OBSERVATION_TYPE_SYSTEM}|${PROVISIONAL_CODE}`,
    _count: "1"
  });
  return provisional.length > 0;
}
function profileClinicalCode(profile) {
  const obs = profile;
  return obs?.valueCodeableConcept?.coding?.find((c) => c.system === PERFIL_CLINICO_SYSTEM)?.code;
}
function patientReference(patient) {
  return { reference: getReferenceString(patient), display: displayName(patient) };
}
function displayName(patient) {
  const name = patient.name?.[0];
  if (!name) {
    return void 0;
  }
  return [name.given?.join(" "), name.family].filter(Boolean).join(" ") || void 0;
}

// src/helpers/types.ts
function pinnedCanonical(resource) {
  if (!resource.url) {
    return void 0;
  }
  return resource.version ? `${resource.url}|${resource.version}` : resource.url;
}

// src/helpers/activity-factory.ts
function buildRequestResource(args) {
  switch (args.activityDefinition.kind) {
    case "ServiceRequest":
      return buildServiceRequest(args);
    case "Appointment":
      return buildAppointment(args);
    case "MedicationRequest":
      return buildMedicationRequest(args);
    case "Task":
      return buildTask(args);
    default:
      return buildTask(args);
  }
}
function buildTaskFromAction(action, ctx, scheduledStart, scheduledEnd, carePlanFullUrl) {
  return {
    resourceType: "Task",
    status: "requested",
    intent: "order",
    code: action.code?.[0] ?? text(action.title),
    description: action.description ?? action.title,
    for: ctx.patientRef,
    requester: ctx.author,
    authoredOn: ctx.start.toISOString(),
    basedOn: [{ reference: carePlanFullUrl }],
    restriction: { period: { start: scheduledStart, end: scheduledEnd } },
    executionPeriod: { start: scheduledStart, end: scheduledEnd }
  };
}
function buildServiceRequest(args) {
  const { activityDefinition: ad, ctx, scheduledStart } = args;
  return {
    resourceType: "ServiceRequest",
    status: "active",
    intent: "order",
    code: ad.code ?? text(ad.title ?? args.fallbackTitle),
    subject: ctx.patientRef,
    requester: ctx.author,
    authoredOn: ctx.start.toISOString(),
    occurrenceDateTime: scheduledStart,
    bodySite: ad.bodySite,
    instantiatesCanonical: pinnedCanonical(ad) ? [pinnedCanonical(ad)] : void 0,
    basedOn: [{ reference: args.carePlanFullUrl }]
  };
}
function buildAppointment(args) {
  const { activityDefinition: ad, ctx, scheduledStart, scheduledEnd } = args;
  return {
    resourceType: "Appointment",
    status: "proposed",
    serviceType: ad.code ? [ad.code] : void 0,
    description: ad.title ?? args.fallbackTitle,
    start: scheduledStart,
    end: scheduledEnd,
    requestedPeriod: [{ start: scheduledStart, end: scheduledEnd }],
    participant: [{ actor: ctx.patientRef, status: "needs-action", required: "required" }]
  };
}
function buildMedicationRequest(args) {
  const { activityDefinition: ad, ctx, scheduledStart } = args;
  const base = {
    resourceType: "MedicationRequest",
    status: "active",
    intent: "order",
    subject: ctx.patientRef,
    requester: ctx.author,
    authoredOn: ctx.start.toISOString(),
    dosageInstruction: ad.dosage,
    dispenseRequest: { validityPeriod: { start: scheduledStart } },
    basedOn: [{ reference: args.carePlanFullUrl }]
  };
  if (ad.productReference) {
    base.medicationReference = ad.productReference;
  } else {
    base.medicationCodeableConcept = ad.productCodeableConcept ?? ad.code ?? text(ad.title);
  }
  return base;
}
function buildTask(args) {
  const { activityDefinition: ad, ctx, scheduledStart, scheduledEnd } = args;
  return {
    resourceType: "Task",
    status: "requested",
    intent: "order",
    code: ad.code ?? text(ad.title ?? args.fallbackTitle),
    description: ad.description ?? ad.title ?? args.fallbackTitle,
    for: ctx.patientRef,
    requester: ctx.author,
    authoredOn: ctx.start.toISOString(),
    basedOn: [{ reference: args.carePlanFullUrl }],
    restriction: { period: { start: scheduledStart, end: scheduledEnd } },
    executionPeriod: { start: scheduledStart, end: scheduledEnd }
  };
}
function text(value) {
  return value ? { text: value } : void 0;
}

// src/helpers/condition-evaluator.ts
import { evalFhirPathTyped, toTypedValue } from "@medplum/core";
function actionApplies(conditions, ctx) {
  if (!conditions?.length) {
    return true;
  }
  return conditions.filter((c) => c.kind === "applicability" && c.expression?.expression).every((c) => evaluate(c, ctx));
}
function evaluate(condition, ctx) {
  const expr = condition.expression;
  if (!expr?.expression) {
    return true;
  }
  const language = expr.language ?? "text/fhirpath";
  if (language !== "text/fhirpath") {
    console.warn(`[apply-plandefinition] unsupported condition language "${language}" -> not applying`);
    return false;
  }
  try {
    const patientTyped = toTypedValue(ctx.patient);
    const variables = {
      "%profile": toTypedValue(ctx.profile),
      "%patient": patientTyped,
      "%subject": patientTyped
    };
    const result = evalFhirPathTyped(expr.expression, [toTypedValue(ctx.patient)], variables);
    return toBoolean(result);
  } catch (err) {
    console.warn(
      `[apply-plandefinition] condition eval failed for "${expr.expression}": ${err.message}`
    );
    return false;
  }
}
function toBoolean(values) {
  if (!values.length) {
    return false;
  }
  if (values.length === 1) {
    const v = values[0].value;
    return typeof v === "boolean" ? v : v !== void 0 && v !== null;
  }
  return true;
}

// src/helpers/journey-sequencer.ts
var UNIT_MS = {
  s: 1e3,
  min: 6e4,
  h: 36e5,
  d: 864e5,
  wk: 6048e5,
  mo: 2592e6,
  // 30d
  a: 31536e6
  // 365d
};
function sequenceActions(actions) {
  const flat = flatten(actions);
  const byId = /* @__PURE__ */ new Map();
  for (const a of flat) {
    if (a.id) {
      byId.set(a.id, a);
    }
  }
  const cache = /* @__PURE__ */ new Map();
  const inFlight = /* @__PURE__ */ new Set();
  const offsetOf = (a) => {
    const cached = cache.get(a);
    if (cached !== void 0) {
      return cached;
    }
    if (inFlight.has(a)) {
      return 0;
    }
    inFlight.add(a);
    let offset = 0;
    const related = a.relatedAction?.find(
      (r) => r.relationship === "after" || r.relationship === "before"
    );
    if (related?.actionId && byId.has(related.actionId)) {
      const base = offsetOf(byId.get(related.actionId));
      const delta = durationToMs(related.offsetDuration) ?? rangeToMs(related.offsetRange) ?? 0;
      offset = related.relationship === "before" ? base - delta : base + delta;
    } else {
      offset = timingOffsetMs(a);
    }
    inFlight.delete(a);
    cache.set(a, offset);
    return offset;
  };
  return flat.map((action) => ({
    action,
    offsetMs: Math.max(0, offsetOf(action)),
    durationMs: stepDurationMs(action),
    absoluteStart: action.timingDateTime
  }));
}
function flatten(actions) {
  const out = [];
  for (const a of actions ?? []) {
    out.push(a);
    if (a.action?.length) {
      out.push(...flatten(a.action));
    }
  }
  return out;
}
function timingOffsetMs(a) {
  return durationToMs(a.timingDuration) ?? durationToMs(a.timingTiming?.repeat?.boundsDuration) ?? 0;
}
function stepDurationMs(a) {
  const t = a.timingTiming;
  return durationToMs(t?.repeat?.boundsDuration) ?? periodMs(a.timingPeriod?.start, a.timingPeriod?.end);
}
function periodMs(start, end) {
  if (!start || !end) {
    return void 0;
  }
  const ms = Date.parse(end) - Date.parse(start);
  return Number.isFinite(ms) && ms > 0 ? ms : void 0;
}
function durationToMs(d) {
  if (d?.value === void 0) {
    return void 0;
  }
  const unit = d.code ?? d.unit ?? "d";
  return d.value * (UNIT_MS[unit] ?? UNIT_MS.d);
}
function rangeToMs(r) {
  return durationToMs(r?.high) ?? durationToMs(r?.low);
}

// src/helpers/transaction-builder.ts
function buildJourneyTransaction(plan, activityDefs, ctx) {
  const carePlanFullUrl = `urn:uuid:${uuid()}`;
  const scheduled = sequenceActions(plan.action ?? []);
  const stepEntries = [];
  const activities = [];
  let skipped = 0;
  for (const step of scheduled) {
    if (!actionApplies(step.action.condition, ctx)) {
      skipped++;
      continue;
    }
    const start = step.absoluteStart ?? isoFromOffset(ctx.start, step.offsetMs);
    const end = step.durationMs ? isoFromOffset(new Date(start), step.durationMs) : void 0;
    let resource;
    const canonical = step.action.definitionCanonical;
    const ad = canonical ? activityDefs.get(canonical) : void 0;
    if (ad) {
      resource = buildRequestResource({
        activityDefinition: ad,
        ctx,
        scheduledStart: start,
        scheduledEnd: end,
        carePlanFullUrl,
        fallbackTitle: step.action.title
      });
    } else if (canonical) {
      console.warn(`[apply-plandefinition] unresolved ActivityDefinition "${canonical}" -> skipping`);
      skipped++;
      continue;
    } else {
      resource = buildTaskFromAction(step.action, ctx, start, end, carePlanFullUrl);
    }
    const fullUrl = `urn:uuid:${uuid()}`;
    stepEntries.push({
      fullUrl,
      request: { method: "POST", url: resource.resourceType },
      resource
    });
    activities.push({
      reference: { reference: fullUrl, display: step.action.title ?? ad?.title }
    });
  }
  const carePlan = {
    resourceType: "CarePlan",
    status: "active",
    intent: "plan",
    title: plan.title,
    description: plan.description,
    // CLAUDE.md: instantiatesCanonical SIEMPRE con versión pineada (auditoría regulatoria).
    instantiatesCanonical: pinnedCanonical(plan) ? [pinnedCanonical(plan)] : void 0,
    subject: ctx.patientRef,
    author: ctx.author,
    created: ctx.start.toISOString(),
    period: { start: ctx.start.toISOString() },
    activity: activities.length ? activities : void 0
  };
  const entry = [
    { fullUrl: carePlanFullUrl, request: { method: "POST", url: "CarePlan" }, resource: carePlan },
    ...stepEntries
  ];
  const stepUrns = stepEntries.map((e) => e.fullUrl).filter(Boolean);
  const provenance = {
    resourceType: "Provenance",
    target: [{ reference: carePlanFullUrl }, ...stepUrns.map((urn) => ({ reference: urn }))],
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
        who: { display: "Bot apply-plandefinition" },
        // El médico/autor que prescribió el combo, cuando viene en el input.
        onBehalfOf: ctx.author
      }
    ],
    entity: provenanceSources(plan, ctx)
  };
  entry.push({ request: { method: "POST", url: "Provenance" }, resource: provenance });
  return {
    bundle: { resourceType: "Bundle", type: "transaction", entry },
    carePlanFullUrl,
    materialized: stepEntries.length,
    skipped
  };
}
function provenanceSources(plan, ctx) {
  const sources = [];
  const planCanonical = pinnedCanonical(plan);
  if (planCanonical) {
    sources.push({ role: "source", what: { display: planCanonical } });
  }
  const profile = ctx.profile;
  if (profile?.resourceType && profile.id) {
    const ref = { reference: `${profile.resourceType}/${profile.id}` };
    sources.push({ role: "source", what: ref });
  }
  return sources.length ? sources : void 0;
}
function isoFromOffset(base, offsetMs) {
  return new Date(base.getTime() + offsetMs).toISOString();
}
function uuid() {
  const c = globalThis.crypto;
  if (c?.randomUUID) {
    return c.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.random() * 16 | 0;
    const v = ch === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}

// src/index.ts
async function handler(medplum, event) {
  const input = event.input;
  if (!input?.patient || !input?.combo) {
    throw new Error("apply-plandefinition requires { patient, combo }");
  }
  const [patient, plan] = await Promise.all([
    resolvePatient(medplum, input.patient),
    resolvePlanDefinition(medplum, input.combo)
  ]);
  let profile;
  if (input.profile !== void 0) {
    profile = await resolveProfile(medplum, input.profile);
  } else {
    const confirmed = await resolveConfirmedProfile(medplum, patient);
    if (!confirmed) {
      const awaiting = await hasProvisionalOnly(medplum, patient);
      throw new Error(
        awaiting ? `apply-plandefinition: phenotype is provisional for ${getReferenceString2(patient)} \u2014 awaiting m\xE9dico confirmation (Task confirm-perfil-clinico). Not generating a plan.` : `apply-plandefinition: no confirmed phenotype (fenotipo-confirmado, status final) for ${getReferenceString2(patient)}.`
      );
    }
    profile = confirmed;
  }
  if (profileClinicalCode(profile) === "generico") {
    console.warn(
      `[apply-plandefinition] generico phenotype for ${getReferenceString2(patient)} with explicit combo=${plan.id}; profile-specific actions will likely be gated out.`
    );
  }
  const activityDefs = await resolveActivityDefinitions(medplum, plan);
  const ctx = {
    patient,
    patientRef: patientReference(patient),
    profile,
    start: input.start ? new Date(input.start) : /* @__PURE__ */ new Date(),
    author: input.author
  };
  const { bundle, carePlanFullUrl, materialized, skipped } = buildJourneyTransaction(
    plan,
    activityDefs,
    ctx
  );
  console.log(
    `[apply-plandefinition] combo=${plan.id} patient=${getReferenceString2(patient)} profile=${profileClinicalCode(profile) ?? "n/a"} steps=${materialized} skipped=${skipped}`
  );
  const response = await medplum.executeBatch(bundle);
  return extractCarePlan(response, carePlanFullUrl);
}
function extractCarePlan(response, carePlanFullUrl) {
  const entries = response.entry ?? [];
  for (const e of entries) {
    if (e.fullUrl === carePlanFullUrl && e.resource?.resourceType === "CarePlan") {
      return e.resource;
    }
  }
  for (const e of entries) {
    if (e.resource?.resourceType === "CarePlan") {
      return e.resource;
    }
  }
  const statuses = entries.map((e) => e.response?.status).join(", ");
  throw new Error(`apply-plandefinition: CarePlan not found in transaction response (statuses: ${statuses})`);
}
export {
  handler
};
