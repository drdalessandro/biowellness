# BIOWELLNESS — FHIR Backend Configuration

> Centro de Optimización Biológica BIOWELLNESS San Isidro
> Razón social: Shanti Om SRL | Roque Sáenz Peña 530, San Isidro, Buenos Aires
> Apertura: 29 jun 2026

Repositorio FHIR-as-Code para BIOWELLNESS. Modela todos los recursos FHIR R4 (CodeSystems, ValueSets, Bots, AccessPolicies, PlanDefinitions, etc.) que se deployan al backend Medplum en `api.medplum.com.ar`.

## Arquitectura

```
┌────────────────────┐         ┌────────────────────┐
│ app.biowellness.ar │         │ app.medplum.com.ar │
│ Chart clínico      │         │ Admin tooling      │
│ (fork chart-demo)  │         │ (Medplum App OSS)  │
└─────────┬──────────┘         └─────────┬──────────┘
          │                               │
          └──────────────┬────────────────┘
                         ▼
            ┌──────────────────────┐
            │ api.medplum.com.ar   │
            │ Project: biowellness │
            └──────────────────────┘
```

**Este repo configura solo el backend (`api.medplum.com.ar`).**

Otros repos relacionados:
- `drdalessandro/biowellness-chart` — Chart médico (fork de `medplum-chart-demo`)
- `drdalessandro/biowellness-portal` — Portal paciente V2 (fork de `medplum/foomedical`)

## URLs canónicas

| Componente | URL | Status |
|---|---|---|
| FHIR backend | `api.medplum.com.ar` | Canónica |
| Admin app | `app.medplum.com.ar` | Canónica |
| Chart clínico | `app.biowellness.ar` | Canónica |
| Portal paciente | `portal.biowellness.ar` | V2 jul-ago 2026 |
| Site público | `www.biowellness.ar` | Canónica |
| ~~api.biowellness.ar~~ | — | **DEPRECADA** (CNAME a api.medplum.com.ar) |

## Quick start

```bash
# Clone
git clone https://github.com/drdalessandro/biowellness.git
cd biowellness

# Install
pnpm install

# Configure
cp .env.example .env.local
# Editar: MEDPLUM_PROJECT_ID, MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET

# Validate FHIR resources
pnpm run validate

# Deploy to staging
pnpm tsx scripts/deploy.ts --env=staging --dry-run
pnpm tsx scripts/deploy.ts --env=staging

# Deploy to production
pnpm tsx scripts/deploy.ts --env=production
```

## Estructura del repo

```
biowellness/
├── fhir/                          # FHIR-as-Code (todo se deploya al Project biowellness)
│   ├── 01-codesystems/
│   ├── 02-valuesets/
│   ├── 03-extensions/
│   ├── 04-organizations/
│   ├── 05-locations/
│   ├── 06-devices/
│   ├── 07-practitioners/
│   ├── 08-practitionerroles/
│   ├── 09-accesspolicies/
│   ├── 10-observationdefinitions/
│   ├── 11-specimendefinitions/
│   ├── 12-chargeitemdefinitions/
│   ├── 13-activitydefinitions/
│   ├── 14-libraries/
│   ├── 15-plandefinitions/
│   ├── 16-questionnaires/
│   ├── 17-operationdefinitions/
│   └── 18-bots/                  # Bot manifests + TypeScript code
├── scripts/                       # Deploy + validate + utilities
├── src/                          # Shared TypeScript (client wrapper, etc.)
├── tests/                        # Unit + integration tests
├── docs/                         # Architecture decisions + runbooks
└── .github/workflows/            # CI/CD
```

## Documentación clave

- [Architecture Deployment](docs/architecture-deployment.md) — Diagrama completo + decisiones
- [Architecture Decisions](docs/architecture-decisions.md) — 36 ADRs históricos
- [Deployment Runbook](docs/deployment-runbook.md) — Step-by-step setup
- [Sprint Plan RC3](docs/sprint-plan-rc3-adjusted.md) — Plan 6 semanas hasta 29 jun
- [Decision Logic Expressions](docs/decision-logic-expressions-v0.3.0.md) — Lógica clínica

## Cambios RC3 importantes

1. **Backend canónico:** `api.medplum.com.ar` (no `api.biowellness.ar`)
2. **Project tenancy:** Project `biowellness` en Medplum desde día 1
3. **3 frontends separados:** chart clínico (MVP) + admin tooling (MVP) + portal paciente (V2)
4. **Portal paciente diferido a V2** (jul-ago 2026)

Ver [docs/architecture-decisions.md](docs/architecture-decisions.md) ADRs 033-036.

## Stack

- **FHIR R4** sobre Medplum self-hosted
- **TypeScript** para Bots + scripts
- **Bots:** AWS Lambda Node 20
- **Infra:** AWS (ECS Fargate, RDS Postgres, ElastiCache, S3, CloudFront, ALB)
- **CI/CD:** GitHub Actions
- **Lab decision logic:** FHIRPath + TypeScript polyglot (ADR-019)
- **LLM:** Claude Sonnet 4 para Bot evaluate-fenotipo Layer 2

## Equipo

- **Director Médico:** Dr. Conrado López Alonso
- **Médicos del programa:** Dra. Stephanie Dos Santos, Dr. Alejandro Sergio D'Alessandro
- **HBOT operators:** Evangelina Varela, Nikita Boltruchek (también osteópata)
- **Nutricionista:** Lic. Diego Sívori
- **Frontend devs:** D1 + D2 + Claude Code
- **Backend / Bots:** Alejandro + Claude Code

## Sprint plan

Ver [docs/sprint-plan-rc3-adjusted.md](docs/sprint-plan-rc3-adjusted.md).

Target: **lunes 29 jun 2026** go-live.

## Licencia

Privado. © Shanti Om SRL 2026.
