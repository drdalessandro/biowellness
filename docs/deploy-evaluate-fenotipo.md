# Deploy del Bot evaluate-fenotipo

## Qué se entrega

| Archivo | Qué es |
|---|---|
| `fhir/18-bots/evaluate-fenotipo/src/index.ts` | Bot handler (3 capas) |
| `fhir/18-bots/evaluate-fenotipo/tests/` | 6 tests vitest (pasan) |
| `fhir/18-bots/evaluate-fenotipo/manifest.json` | Manifest del Bot |
| `fhir/18-bots/evaluate-fenotipo/package.json` | Build ESM + externals (patrón validado) |
| `fhir/17-operationdefinitions/od-evaluate-fenotipo.json` | OperationDefinition $evaluate-fenotipo |

## Arquitectura del Bot

```
Operation $evaluate-fenotipo (patient ref)
  → resolvePatient
  → checkMasterConsent (pre-flight)
  → buildClinicalBundle (consulta Observations + QRs + Conditions)
  → runLayer1Scoring(bundle)   [shared/decision-logic, RC1]
  → Layer 2 STUB: si confidence < 0.75 → marca needsExtraReview (sin LLM aún)
  → Observation 'fenotipo-provisional' (status preliminary)
  → Task 'confirm-perfil-clinico' (SIEMPRE — el médico confirma)
  → Provenance
```

## IMPORTANTE: el import de shared

El Bot hace `import { runLayer1Scoring } from '../../shared/decision-logic'`.

El path es **`../../shared`** (dos niveles): desde `evaluate-fenotipo/src/` sale a
`evaluate-fenotipo/`, luego a `18-bots/`, donde está `shared/`. Verificá que tu
estructura sea:

```
fhir/18-bots/
├── shared/decision-logic/    ← las scoring functions de RC1
│   ├── index.ts (runLayer1Scoring)
│   ├── score-menopausia.ts
│   ├── ... etc
└── evaluate-fenotipo/
    └── src/index.ts          ← importa ../../shared/decision-logic
```

esbuild bundlea todo el árbol de `shared/` dentro del `dist/index.mjs`. Las deps
`@medplum/*` quedan external (las provee el runtime).

## Pasos de deploy

### 1. Copiar archivos al repo

```bash
cd ~/biowellness-deploy
cp -r /ruta/evaluate-fenotipo-fase5/fhir/18-bots/evaluate-fenotipo/* fhir/18-bots/evaluate-fenotipo/
cp /ruta/evaluate-fenotipo-fase5/fhir/17-operationdefinitions/od-evaluate-fenotipo.json fhir/17-operationdefinitions/
```

> NOTA: el manifest del Bot evaluate-fenotipo YA está deployado (Fase 4). Solo
> sube el código. La OperationDefinition es nueva → hay que deployarla.

### 2. Deployar la OperationDefinition

```bash
npm run deploy -- --filter=fhir/17-operationdefinitions/od-evaluate-fenotipo
```

### 3. Build del Bot

```bash
cd fhir/18-bots/evaluate-fenotipo
npm install
npm test          # 6/6 tests OK
npm run build     # genera dist/index.mjs (~7kb)

# Verificar bundle limpio (debe dar 0)
grep -c ": MedplumClient\|: BotEvent\|interface " dist/index.mjs
```

### 4. Obtener el Bot ID

```bash
export MEDPLUM_BASE_URL=https://api.medplum.com.ar
export MEDPLUM_CLIENT_ID=<client-id>
export MEDPLUM_CLIENT_SECRET=<client-secret>

npx medplum get 'Bot?name=evaluate-fenotipo'
# Anotá el id (UUID)
```

### 5. Deploy del código (CLI o API — NUNCA editor)

```bash
npx medplum bot deploy <BOT_ID> --code dist/index.mjs
```

O por API directa (el método 100% confiable que usamos en lab-ingestion):

```bash
TOKEN=$(curl -s -X POST https://api.medplum.com.ar/oauth2/token \
  -d "grant_type=client_credentials" \
  -d "client_id=$MEDPLUM_CLIENT_ID" \
  -d "client_secret=$MEDPLUM_CLIENT_SECRET" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s -X POST "https://api.medplum.com.ar/fhir/R4/Bot/<BOT_ID>/\$deploy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json; print(json.dumps({'code': open('dist/index.mjs').read()}))")"
```

### 6. Conectar la Operation al Bot

A diferencia de lab-ingestion (que usa Subscription), este Bot se invoca vía
Operation. Hay 2 formas de exponerlo:

**Forma A (MVP simple): invocar el Bot directamente via $execute.**
El chart médico llama:
```
POST /fhir/R4/Bot/<BOT_ID>/$execute
Body: <Patient resource> o <Parameters con patient reference>
```

**Forma B (más FHIR-idiomática): Bot conectado a la OperationDefinition.**
Requiere configurar que `Patient/{id}/$evaluate-fenotipo` enrute al Bot. Esto
depende de soporte de tu versión de Medplum para custom operations via Bot.
Para MVP, usá Forma A.

### 7. Test E2E

Usá el "Paciente de prueba" que ya tiene las 19 Observations cargadas (de
lab-ingestion). Primero asegurate de que tenga Master Consent:

```bash
# Crear Master Consent para el paciente de prueba (si no tiene)
PATIENT_ID=<id-paciente-prueba>
npx medplum post Consent "$(python3 -c "import json; print(json.dumps({
  'resourceType': 'Consent',
  'status': 'active',
  'scope': {'text': 'journey'},
  'category': [{'coding': [{'code': 'master-journey'}]}],
  'patient': {'reference': 'Patient/$PATIENT_ID'}
}))")"

# Invocar el Bot
npx medplum post "Bot/<BOT_ID>/\$execute" "$(python3 -c "import json; print(json.dumps({
  'resourceType': 'Parameters',
  'parameter': [{'name': 'patient', 'valueReference': {'reference': 'Patient/$PATIENT_ID'}}]
}))")"
```

Verificá los resultados:

```bash
# Observation fenotipo-provisional
npx medplum get "Observation?subject=Patient/$PATIENT_ID&_sort=-_lastUpdated&_count=5"

# Task de confirmación
npx medplum get "Task?for=Patient/$PATIENT_ID&_sort=-_lastUpdated"
```

Deberías ver:
- 1 Observation `fenotipo-provisional` con status `preliminary` y el perfil asignado
- 1 Task `confirm-perfil-clinico` con status `requested`

## Layer 2 (LLM) — pendiente

Por ahora Layer 2 es un stub: si `confidence < 0.75`, el Bot marca
`needsExtraReview=true` y pone el Task como `urgent`, pero NO llama a Claude.

Para activar Layer 2 más adelante:
1. Pasar la Claude API key como secret del Bot (Bot secrets, no en código)
2. Implementar la anonimización del bundle (quitar PII)
3. Llamar a la API de Claude con el prompt estructurado
4. Parsear la respuesta y guardarla como DocumentReference
5. Ajustar el Task con el insight del LLM

## Notas clínicas

- El perfil asignado es **provisional** (Observation status `preliminary`).
  Solo se vuelve definitivo cuando un médico completa el Task de confirmación.
- ADR-031: el médico del programa (Stephanie/Alejandro) puede confirmar, no solo
  el Director Médico (Conrado).
- Los pesos del scoring (en shared/decision-logic) están pendientes de
  calibración por el equipo médico antes del go-live.
