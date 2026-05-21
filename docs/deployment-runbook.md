# Deployment Runbook — BIOWELLNESS

Last updated: 2026-05-20 (RC3)

Esta guía documenta el setup completo del sistema desde infra cero hasta sistema operativo en `app.biowellness.ar`.

## Pre-requisitos

- AWS Account con acceso admin
- Dominios registrados: `biowellness.ar` y `medplum.com.ar`
- GitHub access al repo `drdalessandro/biowellness`
- Local dev: Node 20, pnpm, Docker, AWS CLI

## Fase 1: Infraestructura AWS (Sprint 1, día 1-2)

### 1.1 Provisionar Medplum self-hosted

Seguir la [guía oficial de Medplum](https://www.medplum.com/docs/self-hosting). Componentes mínimos:

```
- VPC con 2 subnets públicas (ALB) + 2 privadas (Fargate, RDS)
- RDS Postgres (db.t3.medium, multi-AZ no necesario para MVP)
- ElastiCache Redis (cache.t3.micro)
- ECS Fargate cluster + service (2 tasks min)
- ALB con TLS termination
- S3 bucket para Medplum storage
- ACM certs para api.medplum.com.ar y app.medplum.com.ar
```

CloudFormation/Terraform reference: usar el [medplum-aws-config](https://github.com/medplum/medplum/tree/main/packages/cdk) del upstream.

### 1.2 DNS

```
Route53 zone biowellness.ar:
  app.biowellness.ar      A    → CloudFront chart-clinico (creado en fase 4)
  www.biowellness.ar      A    → CloudFront sitio público
  api.biowellness.ar      CNAME → api.medplum.com.ar       (DEPRECATED)

Route53 zone medplum.com.ar:
  api.medplum.com.ar      A    → ALB Medplum
  app.medplum.com.ar      A    → CloudFront admin app (creado en fase 2)
```

### 1.3 Verificación

```bash
curl https://api.medplum.com.ar/healthcheck
# Esperado: {"ok":true}
```

## Fase 2: Medplum App (admin tooling, día 2)

```bash
# Clone Medplum monorepo
git clone https://github.com/medplum/medplum.git
cd medplum

# Build admin app
pnpm install
MEDPLUM_BASE_URL=https://api.medplum.com.ar pnpm --filter @medplum/app build

# Deploy a S3 + CloudFront
aws s3 sync packages/app/dist/ s3://biowellness-medplum-app/ --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

Verificación: navegar a `https://app.medplum.com.ar`. Debería mostrar login screen Medplum.

## Fase 3: Project setup en Medplum (día 2)

En `app.medplum.com.ar`:

1. **Sign up** con cuenta SuperAdmin (primer usuario es root automáticamente)
2. **Create Project** "biowellness"
   - Name: `biowellness`
   - Type: Healthcare
3. **Anotar Project ID** generado (UUID) — va a `.env`
4. **Create ClientApplication** para deploy:
   - Name: `biowellness-deploy-client`
   - AccessPolicy: SuperAdmin scope (solo para deploy de FHIR-as-Code)
   - Anotar `clientId` y `clientSecret` → AWS Secrets Manager
5. **Create ClientApplication** para chart frontend:
   - Name: `biowellness-chart-clinico`
   - Redirect URIs: `https://app.biowellness.ar/oauth-callback`
6. **Create ClientApplication** para portal V2 (placeholder):
   - Name: `biowellness-portal-paciente`
   - Redirect URIs: `https://portal.biowellness.ar/oauth-callback`
7. **Configure CORS** en Project settings:
   - Allowed origins: `https://app.biowellness.ar`, `https://app.medplum.com.ar`, `https://portal.biowellness.ar`

## Fase 4: Deploy FHIR-as-Code (sem 1, día 3)

```bash
cd ~/code/biowellness
cp .env.example .env.local
# Editar .env.local con MEDPLUM_PROJECT_ID + credentials

# Validar JSONs primero
pnpm run validate

# Deploy a staging primero (si tenés Project biowellness-staging)
MEDPLUM_PROJECT_ID=<staging-id> pnpm tsx scripts/deploy.ts --env=staging --dry-run
MEDPLUM_PROJECT_ID=<staging-id> pnpm tsx scripts/deploy.ts --env=staging

# Si todo OK, deploy a producción
MEDPLUM_PROJECT_ID=<prod-id> pnpm tsx scripts/deploy.ts --env=production
```

Orden de deploy importa (definido en `docs/bootstrap-order.md`):
1. CodeSystems
2. ValueSets
3. Extensions
4. Organization
5. Locations
6. Devices
7. Practitioners
8. PractitionerRoles
9. AccessPolicies
10. ObservationDefinitions
11. ChargeItemDefinitions
12. ActivityDefinitions
13. Library
14. PlanDefinitions
15. Questionnaires
16. OperationDefinitions
17. Bots (manifests; código se uploada después)

## Fase 5: Bot deployment (sem 2-3)

Por cada Bot (`apply-plandefinition`, `evaluate-fenotipo`, `lab-ingestion`, `gate-evaluator`):

```bash
cd fhir/18-bots/<bot-name>
pnpm run build
# Genera dist/index.js

# Upload code al Bot via Medplum CLI o app.medplum.com.ar
medplum bot deploy --bot-id <bot-id> --file dist/index.js
```

Luego en `app.medplum.com.ar`:

1. Configurar Subscription para cada Bot:
   - **apply-plandefinition**: criteria `Task?code=phase-gate-passed&status=requested`
   - **lab-ingestion**: criteria `QuestionnaireResponse?questionnaire=q-lab-ingestion-panel-minimo&status=completed`
   - **gate-evaluator**: criteria `Observation?subject:Patient`
   - **evaluate-fenotipo**: invocado via `$evaluate-fenotipo` operation, no Subscription

2. Test cada Bot vía Bot Debugger en admin app.

## Fase 6: Chart clínico frontend (sem 2-5)

```bash
# Clonar template
git clone https://github.com/medplum/medplum-chart-demo.git biowellness-chart
cd biowellness-chart

# Renombrar / brand
# Editar package.json, README, public/branding

# Configurar
echo "MEDPLUM_BASE_URL=https://api.medplum.com.ar" > .env
echo "MEDPLUM_PROJECT_ID=<id>" >> .env
echo "MEDPLUM_CLIENT_ID=<chart-clinico-client-id>" >> .env

# Desarrollo local
pnpm install
pnpm dev

# Build + deploy
pnpm build
aws s3 sync dist/ s3://biowellness-chart-clinico/ --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

## Fase 7: Site público (sem 3)

Opciones:
- **Webflow / Framer:** simple landing, no requiere backend, deploy desde plataforma
- **Vite estático:** custom HTML/CSS/JS si quieren control total

Ambos apuntan a `www.biowellness.ar` via DNS.

## Fase 8: Portal paciente (DIFERIDO a V2 jul-ago)

```bash
# Sólo en V2
git clone https://github.com/medplum/foomedical.git biowellness-portal
# ... mismo patrón que chart, customizar branding, deploy a portal.biowellness.ar
```

## Smoke test final pre-launch

Antes del 29 jun, checklist:

- [ ] `api.medplum.com.ar/healthcheck` returns OK
- [ ] `app.medplum.com.ar` login funciona, ve Project biowellness
- [ ] `app.biowellness.ar` login funciona con cuenta médico de test
- [ ] Crear Patient de test desde chart funciona
- [ ] Cargar lab via QuestionnaireResponse dispara Bot lab-ingestion (verificable en AuditEvent)
- [ ] Observation creada dispara gate-evaluator
- [ ] Bot apply-plandefinition instancia recursos correctamente
- [ ] WhatsApp Kapso envía mensaje de test
- [ ] Email Postmark envía mensaje de test

## Rollback procedure

Si algo falla post-deploy:

1. **Recursos FHIR:** version control via Provenance + AuditEvent. Recursos individuales se pueden restaurar con `medplum.updateResource()` apuntando a versión anterior.
2. **Bot code:** keep last 5 versiones en S3, rollback con `medplum bot rollback --bot-id <id> --version <N>`.
3. **Frontend:** CloudFront tiene caché. Para rollback rápido: hacer deploy del commit anterior y trigger invalidation.
4. **Backend infra:** mantener AMI snapshot de Fargate task config + RDS snapshot diario.

## Contactos críticos

- AWS support: nivel Business (1h response time)
- Medplum community: GitHub Discussions + Discord
- Equipo médico (Conrado, Stephanie, Alejandro): WhatsApp group
- Devs frontend (D1, D2): WhatsApp group
- Soporte legal (consents): abogado SRL Shanti Om
