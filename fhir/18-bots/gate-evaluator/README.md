# Bot: gate-evaluator

**Diseño:** E6
**Status:** Diseño completo, implementación PENDIENTE.
**Depends on:** Library/biowellness-decision-logic (FHIRPath expressions de gates).

## Función

Cierra el feedback loop del journey. Detecta:
- Gate de fase cumplido → trigger avance via Task
- Regresión (gate previo se rompió) → alerta + pausa
- Valor crítico → propagación de alerta + suspend

## Triggers

1. `Observation` created/updated (Medplum Subscription)
2. Scheduled re-check (cron semanal)
3. Manual re-check (médica desde chart)

## Debounce

5 segundos por patientId para evitar invocaciones múltiples cuando lab-ingestion sube 15 Observations en batch.
