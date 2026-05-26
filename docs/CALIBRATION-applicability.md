# Calibración de `applicability` — apply-plandefinition (Fase 5 Bot #3)

Resuelve la sección 10 del runbook con el output real de `evaluate-fenotipo`. Todas las
expresiones de este documento fueron **verificadas contra el motor FHIRPath de
`@medplum/core` v3.2** (no son teóricas).

---

## 0. El hallazgo que cambia las expresiones

Las notas de Fase 5 proponían leer el perfil con navegación inversa desde el paciente:

```fhirpath
%subject.observation.where(code.coding.where(code='fenotipo-confirmado').exists() and status='final')...
```

**Esto NO funciona.** FHIRPath no tiene navegación inversa: `Patient` no tiene una
propiedad `observation`. Verificado empíricamente → la expresión devuelve `[false]` en
silencio. Combinado con el gating *fail-closed* del orquestador, **toda** acción se
omitiría sin error y el CarePlan saldría vacío. Es el peor failure mode posible en clínica
(falla silenciosa).

**La forma correcta** (la que el orquestador ya soporta): el Bot **resuelve** la
Observation confirmada y la expone como `%profile`. Las condiciones la leen directo:

```fhirpath
%profile.valueCodeableConcept.coding.where(
  system = 'https://biowellness.ar/fhir/CodeSystem/iscca-perfil-clinico'
  and code = 'menopausia'
).exists()
```

Verificado → `[true]` cuando el perfil confirmado es `menopausia`, `[false]` si no.

> **Nota de namespacing (multi-sede).** Los canonicals de las terapias (PlanDefinition,
> ActivityDefinition) son **neutrales**: `https://fhir.biowellness.health/core/…` (core
> compartido entre sedes). En cambio, el system del CodeSystem de fenotipo
> (`…/CodeSystem/iscca-perfil-clinico` y `…/observation-type`) lo define **evaluate-fenotipo**,
> no este Bot: las condiciones deben matchear **exactamente** el string que ese Bot ya
> persiste en las Observations. No reescribir ese system aquí — cambiarlo rompería el match
> del gating. Si evaluate-fenotipo migra su system a neutral, se actualiza en ambos lados a la vez.

---

## 1. Respuestas a las 3 preguntas de diseño

**P3 — ¿profile-driven (a) o médico-driven (b)?** → **(b), ya implementado.**
El orquestador recibe `combo` como input explícito: el médico elige el combo y
`applicability` solo filtra **qué acciones dentro de ese combo** aplican. Es la opción
más segura clínicamente y coincide con la recomendación de las notas. No hay auto-asignación
de combo a partir del perfil.

**P1 — ¿perfil confirmado como Observation nueva o provisional actualizada?** →
Implementado siguiendo la recomendación: Observation **nueva** `fenotipo-confirmado` con
status `final`, dejando la `fenotipo-provisional` como histórico. El resolver
`resolveConfirmedProfile` busca exactamente eso:

```
GET Observation?subject=Patient/<id>&status=final
    &code=https://biowellness.ar/fhir/CodeSystem/observation-type|fenotipo-confirmado
    &_sort=-_lastUpdated&_count=1
```

Si no existe perfil confirmado, el Bot **falla-cerrado** con un mensaje preciso:
- si hay provisional → *"awaiting médico confirmation (Task confirm-perfil-clinico)"*
- si no hay ninguno → *"no confirmed phenotype"*

> Si finalmente deciden actualizar la provisional a `final` en vez de crear una nueva,
> el único cambio es el `code` del search en `resolveConfirmedProfile` (1 línea). El test
> `resolver-confirmed-profile.test.ts` cubre ambas formas vía el code param.

**P2 — ¿la matriz perfil→combo es correcta clínicamente?** → **Decisión médica, no mía.**
Queda como dato asesor en `fixtures/perfil-combo-matrix.json` marcado
`PENDING_CLINICAL_VALIDATION`. No está cableada a la ejecución (model b), así que no afecta
el comportamiento del Bot hasta que Conrado/Stephanie la validen. Sirve como
decision-support para el front que le ofrece combos al médico.

---

## 2. Variables FHIRPath disponibles en las condiciones

| Variable | Valor | Nota |
|---|---|---|
| `%profile` | La Observation `fenotipo-confirmado` resuelta | **Acá se lee el perfil** |
| `%patient` / `%subject` | El recurso `Patient` | Sin navegación inversa a Observations |
| *(root)* | El `Patient` | — |

Helper de lectura del código de perfil (ya en `resolvers.ts`):
`%profile.valueCodeableConcept.coding.where(system = '<iscca>' and code = '<perfil>').exists()`

---

## 3. Expresiones por combo (model b — filtran acciones dentro del combo)

Sea `S = 'https://biowellness.ar/fhir/CodeSystem/iscca-perfil-clinico'`. Patrón base para
"esta acción aplica si el perfil confirmado es uno de estos":

```fhirpath
%profile.valueCodeableConcept.coding.where(system = S and code in ('<p1>' | '<p2>')).exists()
```

Y la exclusión de `generico` (recomendada en cualquier acción específica de perfil):

```fhirpath
%profile.valueCodeableConcept.coding.where(system = S).code != 'generico'
```

Mapeo sugerido de perfiles destino por combo (derivado de la matriz, **pendiente de
validación clínica**):

| Combo (PlanDefinition) | Perfiles objetivo para gating de acciones específicas |
|---|---|
| `pd-combo-bio-energy` | `cardio-metabolico`, `longevidad-biohacking`, `deporte-running` |
| `pd-combo-bio-balance` | `menopausia`, `cardio-metabolico` |
| `pd-combo-bio-recovery` | `estetica-regenerativa`, `deporte-running`, `menopausia` |
| `pd-combo-bio-iv-boost` | `estetica-regenerativa` |
| `pd-combo-bio-elite` | `longevidad-biohacking` |

Ejemplo aplicado (acción IV Boost dentro de `bio-energy`, ya en el fixture):

```fhirpath
%profile.valueCodeableConcept.coding.where(
  system = 'https://biowellness.ar/fhir/CodeSystem/iscca-perfil-clinico'
  and code in ('cardio-metabolico' | 'longevidad-biohacking' | 'deporte-running')
).exists()
```

> Recordá: como es model (b), una acción **sin** `condition` aplica siempre dentro del
> combo elegido. Solo poné `applicability` en las acciones que dependen del perfil.

---

## 4. Trigger correcto del Bot (no es la Observation provisional)

apply-plandefinition se dispara con el **cierre del Task `confirm-perfil-clinico`**
(human-in-the-loop), no con la Observation provisional. Flujo:

```
evaluate-fenotipo  →  Observation fenotipo-provisional (preliminary)  +  Task confirm-perfil-clinico
                                                                              │ (médico confirma)
                                                                              ▼
                                          Observation fenotipo-confirmado (final)
                                                                              │ (médico elige combo)
                                                                              ▼
                                   apply-plandefinition(patient, combo)  →  CarePlan
```

El Bot enforça este orden: si lo invocan antes de la confirmación, falla-cerrado con el
mensaje de "awaiting médico confirmation".

---

## 5. Qué falta para cerrar los 5 combos en prod

1. Confirmar la forma final de la Observation confirmada (P1) — default ya implementado.
2. Validación clínica de la matriz y de los perfiles objetivo por combo (P2) — Conrado/Stephanie.
3. Escribir las `applicability` en las 5 PlanDefinitions reales usando el patrón de §3
   (solo en las acciones perfil-dependientes).
4. Por cada combo: agregar su fixture y extender los tests vitest en
   `fhir/18-bots/apply-plandefinition/tests/`, luego
   `./test/smoke-e2e.sh <BOT_ID>`.
