# Bot: evaluate-fenotipo

**Diseño:** E8 + parte de E1
**Status:** Diseño completo, implementación PENDIENTE.
**Depends on:** `shared/decision-logic/*` (ya implementado en RC1).

## Función

Implementa `OperationDefinition/evaluate-fenotipo`. Asigna perfil clínico dominante via algoritmo de 3 capas con human-in-the-loop.

## Flow

```
1. Pre-flight: Master Consent activo + diagnostic Bundle completo
2. Layer 1: runLayer1Scoring(bundle) → ProfileSelection con confidence
3. Si confidence < 0.75 AND consent-layer2-llm-granted:
   3a. Anonymize bundle (remove PII)
   3b. Call Claude API with structured prompt
   3c. Parse LLM response → store as DocumentReference
4. Layer 3: POST Task code=confirm-perfil-clinico for médico
5. Return OperationOutcome con todos los outputs
```

## Performance target

- Layer 1: <100ms
- Layer 2: 2-5 seg (API call)
- Total: <6 seg target
