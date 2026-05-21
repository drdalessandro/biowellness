# Bot: apply-plandefinition

**Diseño:** E1 (ver `docs/architecture-decisions.md#adr-021`)
**Status:** Diseño completo, implementación PENDIENTE (sem 2-3).

## Función

Operación FHIR custom (`$apply` sobre `PlanDefinition`) que toma una `PlanDefinition` + `Patient` y genera la cadena de 38-50 recursos derivados que materializa el journey personalizado.

## Triggers

1. `Task.completed` con code=`confirm-perfil-clinico` — médico confirmó fenotipo
2. `Task.completed` con code=`phase-gate-passed` — gate-evaluator detectó avance
3. Manual invocation desde chart médico (`app.biowellness.ar`)

## Componentes (Arq-C)

- `orchestrator.ts` — entry point, walks action tree
- `action-walker.ts` — evaluación recursiva de PlanDefinition.action
- `pre-flight.ts` — cascada de validaciones (consent, gates, AccessPolicy, capacity)
- `resource-instantiator.ts` — stamp de ActivityDefinition → MedicationRequest/ServiceRequest/Task
- `consent-generator.ts` — auto-genera Consent específico para nivel-2/nivel-3
- `scheduling-proposer.ts` — slot finding respetando capacity-constraint
- `provenance-recorder.ts` — auditoría regulatoria

## Tiempo target

<3 segundos por invocación.
