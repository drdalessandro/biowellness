# Deploy del Bot lab-ingestion

## Resumen de lo que se entrega

| Archivo | Qué es |
|---|---|
| `fhir/16-questionnaires/q-lab-panel-basico.json` | Questionnaire (formulario de carga, 19 biomarkers) |
| `fhir/18-bots/lab-ingestion/src/index.ts` | Bot handler principal |
| `fhir/18-bots/lab-ingestion/src/loinc-map.ts` | Mapa linkId → LOINC |
| `fhir/18-bots/lab-ingestion/src/critical-values.ts` | Umbrales críticos de seguridad |
| `fhir/18-bots/lab-ingestion/tests/` | 10 tests vitest (todos pasan) |
| `fhir/18-bots/lab-ingestion/examples/` | 2 QuestionnaireResponse de prueba (normal + crítico) |
| `fhir/18-bots/lab-ingestion/manifest.json` | Manifest actualizado (apunta a src/index.ts) |

## Pasos de deploy

### 1. Integrar al repo y deployar el Questionnaire + manifest

```bash
cd ~/biowellness-deploy   # o donde tengas el repo

# Copiar los archivos nuevos
cp -r /ruta/lab-ingestion-fase5/fhir/16-questionnaires/q-lab-panel-basico.json fhir/16-questionnaires/
cp -r /ruta/lab-ingestion-fase5/fhir/18-bots/lab-ingestion/* fhir/18-bots/lab-ingestion/

# Deployar el Questionnaire nuevo (el manifest del Bot ya existe en Medplum)
npm run deploy -- --filter=fhir/16-questionnaires/q-lab-panel-basico
```

### 2. Build del código del Bot

```bash
cd fhir/18-bots/lab-ingestion
npm install
npm test          # confirmar 10/10 tests OK
npm run build     # genera dist/index.cjs
```

### 3. Deploy del código al Bot via Medplum CLI

El manifest del Bot `lab-ingestion` ya está deployado (lo hiciste en Fase 4). Ahora le subimos el CÓDIGO.

Primero necesitás el Bot ID real. Obtenelo:

```bash
# Login con el CLI (usa las credenciales del .env.local)
medplum login
# O con client credentials:
export MEDPLUM_BASE_URL=https://api.medplum.com.ar
export MEDPLUM_CLIENT_ID=<tu-client-id>
export MEDPLUM_CLIENT_SECRET=<tu-client-secret>

# Buscar el Bot por nombre
medplum get 'Bot?name=lab-ingestion'
# Anotá el "id" que devuelve (un UUID)
```

Luego deployá el código:

```bash
# Opción A: deploy directo del source (Medplum compila)
medplum bot deploy <BOT_ID> --source src/index.ts

# Opción B: deploy del bundle ya compilado
medplum bot deploy <BOT_ID> --code dist/index.cjs
```

> Nota: la sintaxis exacta del CLI puede variar según versión. Si `bot deploy` no funciona,
> usá la UI: app.medplum.com.ar → Bot → lab-ingestion → Editor → pegar el contenido de
> dist/index.cjs (o src/index.ts) → Save → Deploy.

### 4. Configurar la Subscription (el trigger)

La Subscription hace que el Bot se ejecute automáticamente cuando llega un QuestionnaireResponse de lab.

En **app.medplum.com.ar**:

1. Ir a **Subscription** (menú izquierdo) → **New**
2. Configurar:
   - **Status:** `active`
   - **Reason:** `lab-ingestion trigger`
   - **Criteria:** `QuestionnaireResponse?questionnaire=https://biowellness.ar/fhir/Questionnaire/q-lab-panel-basico`
   - **Channel type:** `rest-hook`
   - **Channel endpoint:** `Bot/<BOT_ID>` (el UUID del Bot lab-ingestion)
3. Save

O via FHIR-as-Code (recomendado, para versionarlo):

```json
{
  "resourceType": "Subscription",
  "status": "active",
  "reason": "Trigger lab-ingestion Bot on lab panel submission",
  "criteria": "QuestionnaireResponse?questionnaire=https://biowellness.ar/fhir/Questionnaire/q-lab-panel-basico",
  "channel": {
    "type": "rest-hook",
    "endpoint": "Bot/<BOT_ID>"
  }
}
```

Guardalo como `fhir/19-subscriptions/sub-lab-ingestion.json` y deployalo.

> IMPORTANTE: el criteria filtra por status implícitamente. Medplum dispara la Subscription
> en cada create/update del QuestionnaireResponse que matchee. El Bot internamente verifica
> `status === 'completed'` y saltea los borradores, así que no procesa respuestas a medio llenar.

### 5. Test E2E

Necesitás un Patient real primero. Creá uno de prueba en app.medplum.com.ar (Patient → New),
copiá su id, y editá el ejemplo:

```bash
cd fhir/18-bots/lab-ingestion/examples

# Reemplazar el placeholder con un Patient ID real
sed -i 's|REEMPLAZAR-CON-PATIENT-ID-REAL|<patient-uuid>|' qr-ejemplo-normal.json

# Crear el QuestionnaireResponse (esto dispara el Bot via Subscription)
medplum post QuestionnaireResponse "$(cat qr-ejemplo-normal.json)"
```

Luego verificá que el Bot creó los recursos:

```bash
# Deberías ver ~16 Observations nuevas para ese paciente
medplum get "Observation?subject=Patient/<patient-uuid>&_count=20"

# Y 1 DiagnosticReport
medplum get "DiagnosticReport?subject=Patient/<patient-uuid>"
```

Para testear el camino crítico:

```bash
sed -i 's|REEMPLAZAR-CON-PATIENT-ID-REAL|<patient-uuid>|' qr-ejemplo-critico.json
medplum post QuestionnaireResponse "$(cat qr-ejemplo-critico.json)"

# Deberías ver 1 Task urgente creado
medplum get "Task?priority=urgent&for=Patient/<patient-uuid>"
```

### 6. Verificar en AuditEvent / Bot logs

```bash
# Ver los logs de ejecución del Bot
medplum get "AuditEvent?_count=10&_sort=-_lastUpdated"
```

O en app.medplum.com.ar → Bot → lab-ingestion → ver la pestaña de ejecuciones.

## Qué hace el Bot, paso a paso

```
1. Recibe QuestionnaireResponse (de chart médico o portal paciente)
2. Verifica que sea del questionnaire q-lab-panel-basico y status completed
3. Extrae el paciente (subject)
4. Recorre los items, mapea cada linkId → LOINC (loinc-map.ts)
5. Por cada valor:
   - Crea una Observation con LOINC + valueQuantity
   - Busca la ObservationDefinition de ese LOINC y evalúa el rango (normal/alto/bajo)
   - Evalúa umbrales críticos de seguridad (critical-values.ts)
6. Agrupa todo en un DiagnosticReport
7. Si hay valores críticos → crea Task urgente para revisión médica
8. Crea Provenance para auditoría
9. Todo en una transacción atómica (Bundle)
```

## Pendientes / próximos Bots

- Cuando exista el Bot `gate-evaluator`, cada Observation creada va a disparar la
  re-evaluación de gates del paciente (avance de fase). Por ahora lab-ingestion solo carga datos.
- Los umbrales críticos (`critical-values.ts`) deben ser validados por el equipo médico
  (Conrado + Stephanie + Alejandro) antes del go-live.
- V2: el portal paciente (foomedical) va a generar el mismo QuestionnaireResponse, así que
  este Bot lo procesa sin cambios.
