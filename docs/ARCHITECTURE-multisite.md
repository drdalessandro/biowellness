# Arquitectura multi-sede — BioWellness (Fase 5)

> Cómo el repositorio FHIR-as-Code soporta múltiples sedes (San Isidro, y a futuro
> Punta del Este, Pinamar, Mar del Plata, Mendoza…) reutilizando un **core clínico común**
> sobre un **mismo backend Medplum**, con aislamiento de datos por sede.

Este documento fija las decisiones de reutilización y sirve de guía para forkear el
template a una sede nueva. Aplica a todo el repo; `apply-plandefinition` (Fase 5 Bot #3)
es la primera pieza construida bajo este modelo.

---

## 1. Decisiones (confirmadas)

| # | Decisión | Valor |
|---|---|---|
| 1 | Estrategia de reutilización | **Template/fork.** El repo es la plantilla; cada sede es un fork. |
| 2 | Backend | **Un mismo Medplum** (`api.medplum.com.ar`). |
| 3 | Qué es core vs sede | **Core:** terapias y objetivos (idénticos entre sedes). **Sede:** identidad y operación. |
| 4 | Canonical URLs del core | **Neutrales** — `https://fhir.biowellness.health/core/…` (no atados a marca/sede/país). |
| A | Aislamiento de datos | **Un Project Medplum por sede** en el mismo backend. |

### Modelo (A): un Project por sede

```
                    api.medplum.com.ar  (un solo backend Medplum)
        ┌───────────────────────┬───────────────────────┬─────────────────────┐
        ▼                       ▼                       ▼                     ▼
 Project: biowellness-   Project: biowellness-   Project: biowellness-   (futuras…)
        san-isidro              punta-del-este           pinamar
        │                       │                       │
        │  cada Project contiene:                        │
        │   • CORE clínico (mismas terapias, canonicals neutrales) — deployado en cada Project
        │   • CAPA SEDE (Organization, Location, Practitioner, HealthcareService, cupos)
        ▼
   Pacientes de San Isidro NUNCA conviven con los de otra sede (aislamiento por Project).
```

**Por qué (A):** fork + mismo backend exige aislar para que el deploy de una sede no pise
los recursos de otra (mismo canonical = mismo recurso dentro de un Project). Con un Project
por sede, el core neutral se materializa en cada Project sin colisión, y los pacientes
quedan clínicamente aislados (lo más seguro). El precio —duplicar el core en cada Project—
es barato: son recursos de configuración, no datos.

---

## 2. Core vs. Capa Sede

Regla mental: **si dos sedes lo comparten idéntico, es core; si las distingue, es sede.**

| Capa | Recursos | Canonical / identificación | Cambia entre sedes |
|---|---|---|---|
| **Core clínico** (neutral) | CodeSystems/ValueSets, ObservationDefinitions, **ActivityDefinitions**, **PlanDefinitions**, Library, **Bots** | `https://fhir.biowellness.health/core/…` | **No** |
| **Capa Sede** | `Organization`, `Location`, `Practitioner`, `PractitionerRole`, `HealthcareService`, cupos/horarios, AccessPolicies con scoping de sede | Identificación propia de la sede (no canonical neutral) | **Sí** |

Para `apply-plandefinition` esto significa:

- El **Bot y sus PlanDefinitions/ActivityDefinitions son core** — se forkean pero **no se
  editan** por sede. Las terapias y el journey son los mismos en San Isidro o Mendoza.
- Lo que varía (quién la ejecuta, dónde, con qué cupo) entra al journey **en runtime**, no
  en el catálogo: el `author`/requester llega por input del Bot, y la asignación concreta de
  `Practitioner`/`Location` a cada paso es responsabilidad de la capa sede (scheduling), no
  del orquestador.

> Implicancia de diseño ya respetada: el orquestador **no hardcodea** Practitioner ni
> Location. Genera los pasos del journey (qué y cuándo) de forma sede-agnóstica; el quién y
> el dónde son de la sede. Por eso el mismo Bot sirve a todas las sedes sin cambios.

---

## 3. Namespace canónico neutral

El core usa un namespace **independiente de marca, sede y país**:

```
https://fhir.biowellness.health/core/PlanDefinition/pd-combo-bio-energy
https://fhir.biowellness.health/core/ActivityDefinition/ad-iv-boost
```

- `.health` → neutral de país (evita `.ar`, que es identitario).
- `fhir.` → separa el namespace de recursos del sitio público (`www.biowellness.*`).
- `/core/` → marca explícitamente "compartido entre sedes", distinto de cualquier recurso
  identitario de una sede.

**Vocabulario de fenotipo sin cambios:** el system `iscca-perfil-clinico` (y demás
CodeSystems que vienen de `evaluate-fenotipo`) se mantienen tal cual — son vocabulario
compartido y estable; reescribirlos rompería la cadena con el scoring.

> **El canonical es difícil de cambiar después:** queda pineado en `instantiatesCanonical`
> de cada CarePlan histórico (auditoría regulatoria, CLAUDE.md). Fijarlo neutral **ahora**,
> antes de generar CarePlans en producción, evita una migración dolorosa.

---

## 4. Forkear el template a una sede nueva (guía)

> No ejecutar todavía — San Isidro es la única sede en alcance. Esta es la receta para
> cuando se abra la siguiente.

1. **Fork** del repo template → `biowellness-<sede>` (ej. `biowellness-punta-del-este`).
2. **No tocar el core:** `fhir/01-codesystems`, `02-valuesets`, `10-observationdefinitions`,
   `13-activitydefinitions`, `14-libraries`, `15-plandefinitions`, `18-bots`. Se deployan
   tal cual; los canonicals neutrales garantizan que son los mismos recursos clínicos.
3. **Reescribir solo la capa sede:** `04-organizations`, `05-locations`, `07-practitioners`,
   `08-practitionerroles`, `HealthcareService`, cupos/horarios, y las AccessPolicies con el
   scoping del Project de la sede.
4. **Crear el Project** `biowellness-<sede>` en `api.medplum.com.ar`.
5. **Deploy** apuntando al Project de la sede (`MEDPLUM_PROJECT_ID=<project-sede>`).
6. **Validar** con el smoke E2E del Bot contra un paciente de prueba de esa sede.

Lo que **nunca** se forkea-y-edita: terapias, objetivos, scoring, Bots. Si una terapia
cambia, cambia en el **core** y se propaga a todas las sedes (decisión clínica de Conrado/
Stephanie/Alejandro, no de una sede).

> **Caso "una sede no ofrece un combo" (ej. Mendoza sin HBOT):** NO se borra la
> PlanDefinition del core. Se resuelve en la **capa sede** (sin `HealthcareService`/cupo
> para esa terapia → el scheduling no puede agendarla), o gateando por disponibilidad de
> sede en runtime. El catálogo clínico permanece idéntico; la oferta operativa es de la sede.

---

## 5. Toolchain: npm (no pnpm)

Este proyecto usa **npm / npx**. Comandos del Bot:

```bash
# Instalar dependencias
npm install

# Typecheck
npx tsc --noEmit

# Tests (vitest)
npm test -- fhir/18-bots/apply-plandefinition

# Validar JSONs FHIR
npm run validate

# Deploy (dry-run primero) — al Project de la SEDE
MEDPLUM_PROJECT_ID=<project-sede> npx tsx scripts/deploy.ts --env=staging --dry-run
MEDPLUM_PROJECT_ID=<project-sede> npx tsx scripts/deploy.ts --env=staging
```

> Los scripts internos (`scripts/deploy.ts`, `scripts/validate.ts`) se invocan con `npx tsx`.
> Donde la documentación histórica del repo mencione `pnpm`, leerlo como `npm` / `npx`.

---

## 6. Estado de San Isidro (sede actual)

- **Project:** `biowellness-san-isidro` (en `api.medplum.com.ar`).
- **Core deployado:** `apply-plandefinition` + `pd-combo-bio-energy` + sus 4
  ActivityDefinitions, con canonicals neutrales.
- **Capa sede:** Organization Shanti Om SRL, Location Roque Sáenz Peña 530, Practitioners
  (Conrado, Stephanie, Alejandro), HealthcareServices/cupos — gestionados en las carpetas
  `fhir/04-…/05-…/07-…/08-…` (fuera del alcance de Fase 5 Bot #3).

Ver `RUNBOOK-apply-plandefinition.md` para el paso a paso de deploy y verificación, y
`CALIBRATION-applicability.md` para las expresiones de gating por perfil.
