# Architecture Deployment — BIOWELLNESS on Medplum

> Documento canónico de arquitectura de deployment.
> Última actualización: 2026-05-20 (RC3).

## Diagrama de componentes

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRODUCTION — 29 JUN 2026                      │
│                                                                   │
│   ┌────────────────────┐         ┌────────────────────┐         │
│   │ app.biowellness.ar │         │ app.medplum.com.ar │         │
│   │                    │         │                    │         │
│   │ Chart clínico      │         │ Admin tooling      │         │
│   │                    │         │                    │         │
│   │ Fork:              │         │ Origen: Medplum    │         │
│   │ medplum-chart-demo │         │ App (open source)  │         │
│   │                    │         │                    │         │
│   │ Audience:          │         │ Audience:          │         │
│   │ - Médicos          │         │ - Sysadmins        │         │
│   │ - HBOT operators   │         │ - DevOps           │         │
│   │ - Nutric, osteo    │         │ - Claude Code      │         │
│   │ - Secretarías      │         │                    │         │
│   │                    │         │ Workflows:         │         │
│   │ Workflows:         │         │ - Deploy Bots      │         │
│   │ - Chart paciente   │         │ - Edit AccessPol   │         │
│   │ - Prescribir       │         │ - Manage projects  │         │
│   │ - Ver fenotipo     │         │ - View AuditEvents │         │
│   │ - Cargar labs      │         │ - Edit CodeSystems │         │
│   │ - Booking médico   │         │ - ValueSet expand  │         │
│   └─────────┬──────────┘         └─────────┬──────────┘         │
│             │                               │                    │
│             │ HTTPS + OAuth                 │ HTTPS + OAuth      │
│             │ + SSO Google staff            │ + SSO Google admin │
│             │                               │                    │
│             └──────────────┬────────────────┘                    │
│                            ▼                                     │
│            ┌──────────────────────────────┐                     │
│            │   api.medplum.com.ar         │                     │
│            │                              │                     │
│            │   Medplum FHIR backend       │                     │
│            │   self-hosted en AWS         │                     │
│            │                              │                     │
│            │   Project: biowellness       │                     │
│            │   ─────────────────────      │                     │
│            │   ClientApps:                │                     │
│            │     • chart-clinico          │                     │
│            │     • admin-app              │                     │
│            │     • portal-paciente (V2)   │                     │
│            │                              │                     │
│            │   Resources: ~150 FHIR       │                     │
│            │     (Patients, Practitioners,│                     │
│            │      CarePlans, ADs, ODs,    │                     │
│            │      Bots, Bundles, etc.)    │                     │
│            └──────────────────────────────┘                     │
│                            │                                     │
│                            │ trigger Subscriptions               │
│                            ▼                                     │
│            ┌──────────────────────────────┐                     │
│            │   Lambda functions (Bots)    │                     │
│            │     • apply-plandefinition   │                     │
│            │     • evaluate-fenotipo      │                     │
│            │     • lab-ingestion          │                     │
│            │     • gate-evaluator         │                     │
│            └──────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ Bridge externo (consent-crossorg-granted)
                              ▼ (H2 2026)
            ┌──────────────────────────────┐
            │   api.epa-bienestar.com.ar   │
            │   (existente, separado)      │
            └──────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                  V2 — Julio/Agosto 2026                          │
│                                                                   │
│   ┌─────────────────────┐                                        │
│   │ portal.biowellness.ar│                                       │
│   │                      │                                       │
│   │ Fork:                │                                       │
│   │ medplum/foomedical   │                                       │
│   │                      │                                       │
│   │ Pacientes finales:   │                                       │
│   │ - Ver protocolo      │                                       │
│   │ - Resultados lab     │                                       │
│   │ - Wearable sync      │                                       │
│   │ - Cuestionarios      │                                       │
│   │ - Radar BioTerrain   │                                       │
│   └──────────┬───────────┘                                       │
│              │                                                    │
│              └──────────────► api.medplum.com.ar                 │
│                                Project: biowellness              │
└──────────────────────────────────────────────────────────────────┘
```

## Stack tecnológico por componente

### `api.medplum.com.ar` (backend)

- **Origen:** [github.com/medplum/medplum](https://github.com/medplum/medplum) self-hosted
- **Versión target:** latest stable
- **Infra AWS:**
  - ECS Fargate (2 tasks min, autoscale a 6)
  - RDS Postgres (db.t3.medium para MVP, escalable)
  - ElastiCache Redis (cache.t3.micro)
  - S3 (storage de attachments, PDFs de Consent, audit logs)
  - ALB con TLS termination
  - Route53 DNS
  - Lambda functions para Bots (Node 20 runtime)
- **Costo estimado:** USD 350-500/mes para MVP con tráfico de ~50 pacientes activos

### `app.medplum.com.ar` (admin)

- **Origen:** `medplum/packages/app` del monorepo upstream
- **Build:** `pnpm --filter @medplum/app build`
- **Deploy:** S3 + CloudFront, ~5 MB de assets estáticos
- **Customización requerida:** mínima
  - `MEDPLUM_BASE_URL=https://api.medplum.com.ar`
  - Branding opcional (logo Medplum por defecto)
- **Costo:** USD 5-10/mes (CloudFront + S3)

### `app.biowellness.ar` (chart clínico — MVP)

- **Origen:** Fork de [medplum/medplum-chart-demo](https://github.com/medplum/medplum-chart-demo)
- **Repo:** `drdalessandro/biowellness-chart` (separado del biowellness-fhir backend repo)
- **Stack:** Vite + React + TypeScript + @medplum/react + @medplum/core + Mantine UI
- **Customización requerida:**
  - Branding completo BIOWELLNESS (colors, logo, typography)
  - Vista nueva: Radar BioTerrain (Recharts)
  - Vista nueva: Display del fenotipo asignado + scores + features
  - Vista nueva: Lab ingestion form (q-lab-ingestion-panel-minimo)
  - Vista nueva: Gate status del paciente (qué falta para avanzar fase)
  - Customización: filtros por médico activo, secretaría view
  - Integration: invocación del Bot `apply-plandefinition` desde UI
- **Deploy:** S3 + CloudFront, ~3-5 MB assets
- **Costo:** USD 5-10/mes

### `portal.biowellness.ar` (V2)

- **Origen:** Fork de [medplum/foomedical](https://github.com/medplum/foomedical)
- **Repo futuro:** `drdalessandro/biowellness-portal`
- **Stack:** mismo que chart
- **Customización requerida (V2):**
  - Branding BIOWELLNESS
  - Vista journey progress con fases gateadas
  - Display CarePlan activo + next appointments
  - Radar BioTerrain con últimos lab
  - Wearables OAuth flow (Oura, Apple Health, Garmin)
  - Magic link auth + Google SSO paciente
- **Costo cuando deploys:** USD 5-10/mes

### Bot runtime

- **AWS Lambda** functions Node 20
- **Trigger:** Medplum Subscriptions vía rest-hook
- **Memory:** 256-512 MB por function
- **Timeout:** 30s default, 90s para Bot apply-plandefinition (más complejo)
- **Costo:** ~USD 0.20/dia para MVP (~100 invocaciones diarias estimadas)

## DNS configuration

```
Route53 hosted zone: biowellness.ar
├── api.biowellness.ar      CNAME → api.medplum.com.ar    (DEPRECATED, 6 mo)
├── app.biowellness.ar      A     → CloudFront chart-clinico
├── portal.biowellness.ar   A     → CloudFront portal     (V2)
└── www.biowellness.ar      A     → CloudFront site público

Route53 hosted zone: medplum.com.ar
├── api.medplum.com.ar      A     → ALB Medplum backend
└── app.medplum.com.ar      A     → CloudFront admin app
```

## CORS allowed origins

En el server Medplum (env var o admin app config):

```
CORS_ALLOWED_ORIGINS=https://app.biowellness.ar,https://app.medplum.com.ar,https://portal.biowellness.ar
```

## ClientApplications (en Project biowellness)

| ClientApp id | Name | Redirect URIs | Used by |
|---|---|---|---|
| `client-chart-clinico` | BIOWELLNESS Chart | `https://app.biowellness.ar/oauth-callback` | Chart médico |
| `client-admin-app` | Medplum Admin | `https://app.medplum.com.ar/signin/callback` | Admin tooling |
| `client-portal-paciente` (V2) | BIOWELLNESS Portal | `https://portal.biowellness.ar/oauth-callback` | Portal V2 |

## Variables de entorno

Ver `.env.example` para set completo. Las críticas:

```bash
# Backend connection (apunta SIEMPRE al canónico)
MEDPLUM_BASE_URI=https://api.medplum.com.ar
MEDPLUM_PROJECT_ID=<uuid del project biowellness>

# Frontend URLs (para CORS + redirect config)
BIOWELLNESS_CHART_URL=https://app.biowellness.ar
BIOWELLNESS_PORTAL_URL=https://portal.biowellness.ar
MEDPLUM_APP_URL=https://app.medplum.com.ar

# Cross-org bridge (H2 2026)
EPA_BIENESTAR_API_URL=https://api.epa-bienestar.com.ar
EPA_BIENESTAR_API_KEY=<secret manager>

# External services
CLAUDE_API_KEY=<secret manager>
KAPSO_WHATSAPP_TOKEN=<secret manager>
MERCADOPAGO_ACCESS_TOKEN=<secret manager>
```

## Sequence diagrams importantes

### Auth flow staff médico

```
1. Médico navega a app.biowellness.ar
2. Chart redirect → OAuth flow con api.medplum.com.ar
3. Médico hace login con Google (SSO)
4. api.medplum.com.ar valida usuario contra Project biowellness
5. Si autorizado: emite access token
6. Chart recibe token, almacena en memory (no localStorage por seguridad)
7. Chart hace requests con Bearer token
```

### Lab ingestion E2E

```
1. Médica abre app.biowellness.ar/chart/:patientId/labs
2. Completa form → submit
3. POST QuestionnaireResponse a api.medplum.com.ar
4. Medplum Subscription dispara Bot lab-ingestion (AWS Lambda)
5. Bot parsea, valida, crea Observations + DiagnosticReport
6. Bot evalúa qualifiedInterval, marca interpretations
7. Si crítico: crea Task urgent + suspende interventions
8. Bot envía WhatsApp via Kapso al paciente
9. Cada Observation creada dispara gate-evaluator Bot
10. gate-evaluator (con debounce 5s) re-evalúa fase del paciente
11. Si gate cumplido: crea Task phase-gate-passed
12. Bot apply-plandefinition consume el Task → instancia siguiente fase
13. Frontend de la médica refresca y muestra avance
```

Tiempo total end-to-end típico: 5-15 segundos.
