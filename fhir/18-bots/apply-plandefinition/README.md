# Bot: `apply-plandefinition` (Fase 5 · Bot #3 — orquestador)

Capa 4 (Lógica ejecutiva). Toma un **perfil clínico confirmado** + un **combo prescrito
por el médico** y materializa el journey completo en una transacción FHIR atómica:
`CarePlan` + `Task` / `Appointment` / `ServiceRequest` / `MedicationRequest`.

## Modelo (ADR-026)

- **Médico-driven:** el `combo` es input explícito. `applicability` solo filtra **qué
  acciones** del combo aplican según el perfil. La asignación de perfil NO determina el
  combo (perfil ≠ combo).
- **Modelo dual:** Vía A (journey gateado) y Vía B (combo directo VIP) comparten este Bot;
  solo cambia el trigger.
- **Human-in-the-loop:** lee solo `Observation fenotipo-confirmado` (status `final`).
  Falla-cerrado si solo existe el provisional (evaluate-fenotipo Layer 3).
- **Core compartido (multi-sede):** este Bot y sus PlanDefinitions/ActivityDefinitions son
  **core neutral** (`https://fhir.biowellness.health/core/…`) — idénticos en todas las sedes,
  se forkean pero **no se editan** por sede. Lo que varía por sede (Practitioner, Location,
  cupos) entra en runtime, no en el catálogo. Ver `docs/ARCHITECTURE-multisite.md`.

## Estructura

```
apply-plandefinition/
├── manifest.json           # Bot manifest (id TODO)
├── README.md
├── src/
│   ├── index.ts            # handler — orquestador delgado
│   └── helpers/
│       ├── types.ts            # contrato de input + pinnedCanonical()
│       ├── resolvers.ts        # Patient, PlanDefinition, ActivityDefinitions, perfil CONFIRMADO
│       ├── journey-sequencer.ts# offsets por acción (relatedAction + timing)
│       ├── condition-evaluator.ts # gating applicability vía FHIRPath (%profile/%patient), fail-closed
│       ├── activity-factory.ts # ActivityDefinition.kind → recurso de pedido concreto
│       └── transaction-builder.ts # ensambla el Bundle atómico + Provenance
└── tests/                  # vitest
    ├── journey-transaction.test.ts
    ├── resolvers.test.ts
    └── fixtures/           # bio-energy (perfil cardio-metabolico / menopausia)
```

## Contrato de input

```ts
{
  patient: string | Reference<Patient>;          // "Patient/<id>" | id | Reference
  combo:   string;                                // id → name → canonical url
  profile?: Reference | Record<string, unknown>;  // opcional; si falta, resuelve el confirmado
  start?:  string;                                // ISO-8601; ancla el timing relativo
  author?: AuthorReference;                       // requester/author de los recursos
}
```

Variables FHIRPath en las condiciones `applicability` (keys con `%`, verificado en
`@medplum/core` v4.5):
`%profile` = Observation confirmada · `%patient` / `%subject` = Patient.
Leer el perfil como `%profile.valueCodeableConcept.coding.where(...)`. **No** existe
navegación inversa `%subject.observation...` (colapsa a `false`).

## Tests

```bash
npm test -- fhir/18-bots/apply-plandefinition
```

11 checks: timing (día 0/+2/+5/+28), mapeo de kinds, gating por perfil, cross-refs al
CarePlan, y resolución confirmado-vs-provisional.

## Deuda conocida (TODO antes de prod)

- Las `applicability` de los otros 4 combos requieren validación clínica de la matriz
  (`docs/perfil-combo-matrix.advisory.json`, `PENDING_CLINICAL_VALIDATION`).
- Confirmar `Bot id` en el manifest.

Provenance del CarePlan + pasos: **implementada** (patrón lab-ingestion).

Detalle de calibración: `docs/CALIBRATION-applicability.md`.
Runbook completo: `docs/RUNBOOK-apply-plandefinition.md`.
