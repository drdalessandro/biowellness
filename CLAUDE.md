# CLAUDE.md — BIOWELLNESS FHIR Backend

> Onboarding doc para Claude Code y otros assistants agéntico operando este repo.

## Contexto del proyecto

Este es el repositorio FHIR-as-Code de **BIOWELLNESS San Isidro**, centro premium de optimización biológica que abre el **29 jun 2026** en Roque Sáenz Peña 530, San Isidro, Buenos Aires. Razón social: Shanti Om SRL.

El sistema corre sobre **Medplum self-hosted** con tenancy multi-Project. Este repo configura el Project `biowellness` exclusivamente. No incluye el código del chart médico (vive en `biowellness-chart` repo separado) ni el portal paciente (V2, foomedical fork).

## Arquitectura mental

Cuando trabajés en este repo, mantené en mente:

```
3 frontends sobre 1 backend único:
  app.biowellness.ar  → chart médico (medplum-chart-demo fork)
  app.medplum.com.ar  → admin tooling (Medplum App OSS, sin código custom)
  portal.biowellness.ar → portal paciente (V2 jul-ago, foomedical fork)

Todos consumen: api.medplum.com.ar (Project: biowellness)
```

Si un cambio afecta a los 3 frontends → es cambio FHIR backend (este repo).
Si un cambio afecta solo al chart → va en repo `biowellness-chart`.
Si un cambio es admin tooling → ni se toca, lo provee Medplum.

## Capas conceptuales del sistema

1. **Vocabulario** (CodeSystems, ValueSets, Extensions) — base semántica
2. **Estructura organizacional** (Organization, Locations, Practitioners, PractitionerRoles, AccessPolicies)
3. **Catálogo clínico** (ObservationDefinitions, ActivityDefinitions, PlanDefinitions, Library, Questionnaires)
4. **Lógica ejecutiva** (Bots: apply-plandefinition, lab-ingestion, gate-evaluator, evaluate-fenotipo)
5. **Frontends** (no en este repo)

Los cambios típicamente afectan 1-2 capas. Cambios cross-cutting (ej. agregar un nuevo perfil clínico) tocan vocabulario + catálogo + lógica.

## Framework conceptual

BIOWELLNESS adopta framework propia que combina:
- ISSCA como **referencia bibliográfica** (Lapeire NO está en el proyecto, ADR-025)
- Cleveland Clinic + Institute for Functional Medicine
- Hormesis + bioenergética mitocondrial
- Benchmarks SHA Wellness, Lanserhof

CodeSystems con prefijo `iscca-*` mantienen ese naming por convención, pero el sistema NO es ISSCA-céntrico operacionalmente.

## Modelos importantes a respetar

### Modelo dual de entrada (ADR-026)

- **Vía A** (mayoritaria): journey gateado con 4 fases (preparatoria → optimización → regenerativa → mantenimiento) y gates clínicos
- **Vía B** (excepción): paciente VIP / del Dr. Conrado / derivación externa recibe combo directo sin journey

Ambos comparten ActivityDefinitions y Bots, solo cambia el trigger de `apply-plandefinition`.

### Matriz perfil × combo (ADR-026)

- 6 perfiles clínicos asignan **tipo de paciente** (menopausia, longevidad, estética, deporte, cardio-metab, genérico)
- 5 combos BIO (energy, recovery, balance, iv-boost, elite) son **opciones de intervención** que el médico prescribe
- NO son lo mismo. La asignación de perfil NO determina automáticamente un combo único.

### Backup flexible Director Médico (ADR-031)

- Conrado López Alonso es Director Médico
- Stephanie Dos Santos y Alejandro D'Alessandro son médicos del programa
- En ausencia del director, los médicos del programa pueden hacer evaluaciones de terapias biológicas con MISMA autoridad
- Esto se materializa en `evaluacion-medica-vigente` FHIRPath gate

## Conventions importantes

- **Naming:** PlanDefinitions usan prefix `pd-`, ActivityDefinitions `ad-`, ObservationDefinitions `obs-def-`, AccessPolicies `ap-`, Extensions `iscca-`
- **Versioning:** `version` field semver. Bumps mayores requieren ADR.
- **instantiatesCanonical:** SIEMPRE pin version (`url|version`) para auditoría
- **Provenance:** crítico, no opcional. Cada write significativo genera Provenance.
- **Idempotencia:** Bots deben ser idempotentes (mismo input → mismo output, no side-effects duplicados)
- **JSON pretty-printed** para diffs legibles en PRs
- **Comentarios:** en español para staff médico, en inglés para código técnico

## Tareas para Claude Code típicas

### Cuando agregar una nueva ActivityDefinition

1. Crear archivo en `fhir/13-activitydefinitions/ad-{nombre}.json`
2. Seguir template de `ad-hbot-sesion.json` o `ad-recovery-pro-circuito.json`
3. Incluir Extensions: `iscca-nivel-evidencia`, `iscca-capacidad-operativa-diaria`, `iscca-pre-procedure-gate`
4. Si requiere consent específico nivel-2/3: crear Questionnaire correspondiente en `fhir/16-questionnaires/`
5. Agregar tests si tiene lógica compleja

### Cuando agregar una nueva ObservationDefinition

1. Crear archivo en `fhir/10-observationdefinitions/obs-def-{nombre}.json`
2. Usar LOINC code preferido cuando exista
3. Definir `qualifiedInterval[]` con contexts apropiados (lab-reference, optimo-biowellness, gate-*, critico-alerta)
4. Si threshold afecta gate clínico: actualizar Library v0.X.Y
5. Bump versión Library si aplica

### Cuando modificar la Library

1. Bump version (0.X.Y → 0.X+1.0 si breaking, 0.X.Y+1 si patch)
2. Documentar cambios en `docs/decision-logic-expressions-vX.Y.Z.md`
3. Actualizar base64-encoded expressions en JSON
4. Si cambia threshold de un gate: alertar a equipo médico (es decisión clínica)
5. CarePlans activos NO se ven afectados (instantiatesCanonical pin)

### Cuando implementar un Bot

1. Manifests están en `fhir/18-bots/{name}/manifest.json`
2. Código TypeScript en `fhir/18-bots/{name}/`
3. Estructura: `index.ts` entry point + módulos especializados
4. Tests con vitest en `fhir/18-bots/{name}/tests/`
5. Shared decision logic en `fhir/18-bots/shared/decision-logic/`
6. Deploy via `medplum bot deploy --bot-id <id> --file dist/index.js`

## Comandos útiles

```bash
# Validar JSONs
pnpm run validate

# Deploy a staging (dry-run primero)
MEDPLUM_PROJECT_ID=<staging-id> pnpm tsx scripts/deploy.ts --env=staging --dry-run
MEDPLUM_PROJECT_ID=<staging-id> pnpm tsx scripts/deploy.ts --env=staging

# Deploy filtrado (solo CodeSystems)
pnpm tsx scripts/deploy.ts --filter=fhir/01-codesystems

# Tests
pnpm test
pnpm test -- --watch fhir/18-bots/shared/decision-logic
```

## Lo que NO hacer

- **No** crear pantallas frontend en este repo. Ese trabajo va en `biowellness-chart` o `biowellness-portal` (V2)
- **No** intentar reemplazar funcionalidad de Medplum App (`app.medplum.com.ar`). Si necesitás CRUD de AccessPolicies, usá la UI nativa
- **No** modificar resources directamente en producción sin pasar por scripts/deploy.ts (perdés auditabilidad)
- **No** olvidar el pin de versión en `instantiatesCanonical` — es auditabilidad regulatoria crítica
- **No** mezclar lógica clínica con código de transporte — lógica vive en Library + scoring TS, no in-line en Bots

## Recursos externos

- [Medplum docs](https://www.medplum.com/docs)
- [medplum-chart-demo](https://github.com/medplum/medplum-chart-demo) — base del chart clínico
- [foomedical](https://github.com/medplum/foomedical) — base del portal paciente V2
- FHIR R4 spec: https://hl7.org/fhir/R4/

## Para issues complejos

1. Buscar en ADRs históricos primero: `docs/architecture-decisions.md`
2. Consultar `docs/architecture-deployment.md` para questions de arquitectura
3. Si afecta a clinical logic: el cambio requiere validación de equipo médico (Conrado, Stephanie, Alejandro)
4. Si no está claro: preguntar a Alejandro antes de cambiar
