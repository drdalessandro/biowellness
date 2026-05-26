# Fase 5 · Bot #3 — `apply-plandefinition` (Orquestador)

Runbook de extremo a extremo: del código a un CarePlan persistido y verificado en
`api.medplum.com.ar`. Proyecto Medplum `96cd2ddd-f261-490a-9928-31cb9f8bc3d8`.

> Patrón de build/deploy idéntico a `lab-ingestion` y `evaluate-fenotipo`:
> esbuild ESM + `@medplum/core` como external, deploy vía `curl` al `$deploy`.

---

## 0. Qué hace el bot

Toma un **perfil de fenotipo confirmado** + un **combo elegido** (uno de los 5
PlanDefinitions `pd-combo-*`) y materializa el **journey completo** en una sola
transacción atómica: `CarePlan` + sus `ServiceRequest` / `Appointment` / `Task` /
`MedicationRequest`, cada uno agendado relativo al inicio del journey y filtrado por la
condición `applicability` de su acción (FHIRPath sobre el Patient + `%profile`).

Entrada → salida:

```
{ patient, combo, profile?, start?, author? }   ──▶   CarePlan persistido (con activity[] → cada paso)
```

Diseño E1 / ADR-021 — orquestador delgado sobre helpers de responsabilidad única:

| Archivo | Responsabilidad |
|---|---|
| `src/index.ts` | Handler. Resuelve mundo → arma contexto → construye transacción → ejecuta → devuelve CarePlan |
| `helpers/resolvers.ts` | Lee Patient, PlanDefinition (id→name→url), ActivityDefinitions, profile |
| `helpers/journey-sequencer.ts` | Offset por acción: `relatedAction` → `timingDuration` → `boundsDuration` → `timingDateTime` |
| `helpers/condition-evaluator.ts` | Gating `applicability` vía FHIRPath; **fail-closed** |
| `helpers/activity-factory.ts` | `ActivityDefinition.kind` → recurso de pedido concreto |
| `helpers/transaction-builder.ts` | Ensambla el Bundle atómico (CarePlan + pasos, cross-refs `urn:uuid`) |

---

## 1. Prerrequisitos

- Node ≥ 18, **npm** (este repo usa npm/npx; donde la doc histórica diga `pnpm`, leer `npm`)
- `jq` y `curl` en el PATH
- Acceso al Project Medplum de la sede (San Isidro: `biowellness-san-isidro`)
- Un access token del Project exportado como `MEDPLUM_TOKEN`

```bash
export MEDPLUM_BASE_URL="https://api.medplum.com.ar"
export MEDPLUM_PROJECT_ID="<project-id-de-la-sede>"   # modelo (A): un Project por sede
export MEDPLUM_TOKEN="<access_token>"
```

> Token vía OAuth client-credentials del Project. No versionar secretos.
> Multi-sede: cada sede deploya a SU Project. Ver `ARCHITECTURE-multisite.md`.

---

## 2. Instalar, typecheck y tests

```bash
npm install
npx tsc --noEmit                              # typecheck → limpio
npm test -- fhir/18-bots/apply-plandefinition # vitest: 11 checks (7 journey + 4 resolver)
```

Los tests corren el núcleo puro **sin servidor** contra los fixtures de `bio-energy` y
verifican:

- perfil confirmado `cardio-metabolico` → 4 pasos materializados, 0 omitidos
- perfil confirmado `menopausia` → IV Boost filtrado por `applicability` (3 pasos, 1 omitido)
- timing relativo: día 0 / +2 / +5 / +28 desde `start`
- mapeo de `kind` → `ServiceRequest` / `MedicationRequest` / `Task` / `Appointment`
- cada paso referencia el `CarePlan` por `urn:uuid`
- resolución confirmado-vs-provisional (human-in-the-loop)

Salida esperada:

```
 ✓ fhir/18-bots/apply-plandefinition/tests/journey-transaction.test.ts  (7 tests)
 ✓ fhir/18-bots/apply-plandefinition/tests/resolvers.test.ts  (4 tests)
 Test Files  2 passed (2)
      Tests  11 passed (11)
```

---

## 3. Crear/registrar el recurso `Bot`

Si el Bot ya existe en el Project de la sede, saltá al paso 4 con su id. Para crearlo:

```bash
BOT_ID=$(curl -fsS -X POST "$MEDPLUM_BASE_URL/fhir/R4/Bot" \
  -H "Authorization: Bearer $MEDPLUM_TOKEN" \
  -H "Content-Type: application/fhir+json" \
  -d '{
    "resourceType": "Bot",
    "name": "apply-plandefinition",
    "description": "Fase 5 Bot #3 — orquestador PlanDefinition -> CarePlan journey",
    "runtimeVersion": "awslambda"
  }' | jq -r '.id')
echo "BOT_ID=$BOT_ID"
```

Completá ese id en `fhir/18-bots/apply-plandefinition/manifest.json`.

> Para invocarlo por `$execute` necesitás un `ProjectMembership` con `AccessPolicy` que
> permita `CarePlan`, `Task`, `Appointment`, `ServiceRequest`, `MedicationRequest` (write)
> y lectura de `Patient` / `PlanDefinition` / `ActivityDefinition` / `Observation`. Este Bot
> no introduce resource types fuera de esa lista.

---

## 4. Deploy (al Project de la sede)

El deploy usa el script del repo (no scripts ad-hoc). Dry-run primero:

```bash
# Validar JSONs FHIR del core + capa sede
npm run validate

# Deploy del Bot (y recursos) al Project de la sede
MEDPLUM_PROJECT_ID="$MEDPLUM_PROJECT_ID" npx tsx scripts/deploy.ts --env=staging --dry-run
MEDPLUM_PROJECT_ID="$MEDPLUM_PROJECT_ID" npx tsx scripts/deploy.ts --env=staging

# Deploy filtrado (solo este Bot)
npx tsx scripts/deploy.ts --filter=fhir/18-bots/apply-plandefinition
```

Verificá que la respuesta no traiga `issue[].severity = error`.

---

## 5. Sembrar el core clínico (una vez por Project de sede)

El core (PlanDefinition + ActivityDefinitions) tiene canonicals **neutrales**
(`https://fhir.biowellness.health/core/…`) y es idéntico en todas las sedes. Se deploya con
`scripts/deploy.ts` junto al resto del catálogo; los archivos viven en:

- `fhir/15-plandefinitions/PlanDefinition-pd-combo-bio-energy.json`
- `fhir/13-activitydefinitions/ActivityDefinition-ad-*.json`

> Upsert idempotente por `url` (canonical neutral) → re-deployar no duplica. Como cada sede
> tiene su Project, el mismo canonical convive sin colisión entre Projects.

---

## 6. Smoke E2E contra el servidor

Invocación manual (el Bot resuelve el perfil **confirmado** del paciente):

```bash
curl -fsS -X POST "$MEDPLUM_BASE_URL/fhir/R4/Bot/$BOT_ID/\$execute" \
  -H "Authorization: Bearer $MEDPLUM_TOKEN" -H "Content-Type: application/fhir+json" \
  -d '{
    "patient": "Patient/<PATIENT_ID>",
    "combo": "pd-combo-bio-energy",
    "start": "2026-06-01T09:00:00.000Z"
  }' | jq '{id, status, activities: (.activity | length)}'
```

Prerequisito del paciente: debe existir una `Observation fenotipo-confirmado` (status
`final`) para `Patient/<PATIENT_ID>`. Si solo hay provisional, el Bot **falla-cerrado** con
"awaiting médico confirmation" (correcto: respeta el human-in-the-loop). Para pasar un perfil
explícito en tests, agregá `"profile": <Observation confirmada>` al body.

---

## 7. Resultados esperados

Para el combo `bio-energy` con perfil confirmado `cardio-metabolico` y
`start = 2026-06-01T09:00Z`:

| Acción (PlanDefinition) | ActivityDefinition.kind | Recurso generado | Inicio agendado |
|---|---|---|---|
| `baseline-eval` | ServiceRequest | `ServiceRequest` (occurrenceDateTime) | día 0 |
| `iv-boost-session` *(gated)* | MedicationRequest | `MedicationRequest` | +2 días |
| `followup-call` | Task | `Task` (executionPeriod) | +5 días |
| `reassessment` | Appointment | `Appointment` (start/end) | +28 días |

- `CarePlan.status = active`, `intent = plan`,
  `instantiatesCanonical = [https://fhir.biowellness.health/core/PlanDefinition/pd-combo-bio-energy|1.0.0]`
  (canonical neutral, **con versión pineada**)
- `CarePlan.activity` tiene 4 entradas, cada una `reference` → su paso
- Cada paso (salvo Appointment) trae `basedOn → CarePlan/<id>`
- Con perfil confirmado `menopausia` el `MedicationRequest` IV Boost **no** se crea (la
  condición de perfil `cardio-metabolico | longevidad-biohacking | deporte-running` es
  falsa); CarePlan queda con 3 actividades
- Se crea una `Provenance` (auditoría) en la misma transacción: `target` = CarePlan + cada
  paso, `activity = CREATE`, `agent` = assembler (Bot) con `onBehalfOf` = médico prescriptor,
  `entity.source` = PlanDefinition (canonical pineado) + Observation confirmada

Verificación post-hoc:

```bash
CP=<CAREPLAN_ID>
curl -fsS "$MEDPLUM_BASE_URL/fhir/R4/CarePlan/$CP" \
  -H "Authorization: Bearer $MEDPLUM_TOKEN" | jq '{status, intent, activities:(.activity|length)}'
curl -fsS "$MEDPLUM_BASE_URL/fhir/R4/Task?based-on=CarePlan/$CP" \
  -H "Authorization: Bearer $MEDPLUM_TOKEN" | jq '.total'
```

---

## 8. Contrato de entrada (referencia)

```ts
interface ApplyPlanDefinitionInput {
  patient: string | Reference<Patient>;   // "Patient/<id>" | id | Reference
  combo: string;                           // id → name → canonical url (en ese orden)
  profile?: Reference | Record<string, unknown>;  // de evaluate-fenotipo; expuesto como %profile
  start?: string;                          // ISO-8601; ancla TODO el timing relativo (default: now)
  author?: AuthorReference;                // requester/author de los recursos generados
}
```

Variables FHIRPath disponibles en las condiciones `applicability`:

- `%profile` → el perfil **confirmado** resuelto (Observation `fenotipo-confirmado`,
  status `final`). Las condiciones lo leen así:
  `%profile.valueCodeableConcept.coding.where(system='<iscca>' and code='menopausia').exists()`
- `%patient` / `%subject` → el recurso Patient
- root de evaluación → el Patient

> **Perfil confirmado, no provisional.** Si no pasás `profile` en el input, el Bot resuelve
> la Observation `fenotipo-confirmado` (status `final`) del paciente. Si solo hay
> provisional, **falla-cerrado** ("awaiting médico confirmation") — enforça el
> human-in-the-loop de evaluate-fenotipo Layer 3. Pasar `profile` explícito (Reference u
> objeto) saltea la resolución (útil para tests / invocación médica directa).

> **Sin navegación inversa.** FHIRPath no resuelve `%subject.observation...` (Patient no
> tiene esa propiedad → colapsa a `false` en silencio). Leé siempre `%profile`. Detalle y
> expresiones por combo en `docs/CALIBRATION-applicability.md`.

> **Convención de keys (verificada):** en `@medplum/core` v3.2 las variables se registran
> **con** el prefijo `%` (`{ '%profile': ... }`). El test offline lo cubre; si subís de
> versión, re-corré `npm test` antes de deployar.

---

## 9. Decisiones de diseño y bordes

- **Atomicidad:** todo el journey es un único Bundle `transaction` → o se crea entero o
  nada. No hay estados parciales.
- **Fail-closed en gating:** condición con lenguaje no soportado o que tira error → la
  acción **no** se materializa (nunca emitimos un paso sobre una regla no verificada).
- **AD no resuelta:** si una acción referencia un `definitionCanonical` que no existe, el
  paso se omite (cuenta en `skipped`) y se loguea; no se crea un recurso vacío.
- **Acción sin `definitionCanonical`:** se captura igual como `Task` para no perder pasos
  del journey.
- **`Appointment.basedOn` (R4)** solo admite `ServiceRequest`, así que el back-link al
  CarePlan va por `CarePlan.activity[].reference`, no por `basedOn` en el Appointment.
- **Guard de ciclos** en `relatedAction`: un grafo cíclico colapsa a offset 0 en vez de
  colgar.

---

## 10. Calibración de los otros 4 combos

Las 3 preguntas de diseño quedaron resueltas (detalle y expresiones verificadas en
`docs/CALIBRATION-applicability.md`):

- **Modelo (b) médico-driven** — el médico elige el combo; `applicability` solo filtra qué
  acciones dentro del combo aplican. Ya implementado (el `combo` es input explícito).
- **Perfil confirmado** — Observation `fenotipo-confirmado` status `final`; el Bot la
  resuelve y falla-cerrado si solo hay provisional.
- **Matriz perfil→combo** — `fixtures/perfil-combo-matrix.json`, asesora y marcada
  `PENDING_CLINICAL_VALIDATION` (decisión de Conrado/Stephanie); no cableada a la ejecución.

Para pasar `recovery / balance / iv-boost / elite` a producción:

1. Validación clínica de la matriz y de los perfiles objetivo por combo.
2. Escribir las `applicability` en las 5 PlanDefinitions reales con el patrón
   `%profile.valueCodeableConcept.coding.where(system='<iscca>' and code in (...)).exists()`
   (solo en acciones perfil-dependientes; las demás aplican siempre dentro del combo).
3. **Cobertura de `kind`** — kinds fuera de los 4 soportados degradan a `Task` hoy; para
   `CommunicationRequest` u otro, se agrega un branch en `activity-factory.ts` (1 función).
4. Por combo: fixture + extender los tests vitest en
   `fhir/18-bots/apply-plandefinition/tests/`, luego smoke E2E (paso 6) contra el Project
   de la sede.
