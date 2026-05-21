# Bot: lab-ingestion

**Diseño:** E7
**Status:** Diseño completo, implementación PENDIENTE (sem 2-3).

## Función

Ingesta laboratory results desde 3 caminos:
- A. QuestionnaireResponse manual (médica) — MVP día 1
- B. PDF + OCR + Claude API — V2 (jul-ago)
- C. Wearable Bundle import — reuso pipeline EPA

## Flow

```
1. Pre-flight: Master Consent + AccessPolicy
2. Parse input según trigger type
3. Validate against ObservationDefinitions
4. Build Observations transaction
5. Evaluate qualifiedInterval → set interpretation[]
6. Detect critical values
7. Atomic commit (DiagnosticReport + Observations + Provenance)
8. If critical: create urgent Task + suspend high-intensity interventions
9. Notify patient via WA/email per Consent
```
