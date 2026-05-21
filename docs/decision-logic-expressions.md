# Decision Logic Expressions — Source of Truth (v0.2.0)

> Library version 0.2.0. Las versiones base64-encoded viven en
> `fhir/14-libraries/biowellness-decision-logic.json`.
> Este archivo es la **referencia legible para humanos**.

**Status:** Draft — calibración inicial estimada, refinamiento en RC2/RC3 según equipo médico.

## Helpers (FHIRPath)

### `pcr-us-recent`
```fhirpath
%context.observation
  .where(code.coding.exists(system = 'http://loinc.org' and code = '30522-7'))
  .where(effectiveDateTime > today() - 28 days)
  .where(status = 'final')
  .sort(effectiveDateTime descending)
  .first()
  .valueQuantity.value
```

### `psqi-recent`
```fhirpath
%context.observation
  .where(code.coding.exists(system = 'http://loinc.org' and code = '72133-2'))
  .where(effectiveDateTime > today() - 14 days)
  .sort(effectiveDateTime descending)
  .first()
  .valueQuantity.value
```

### `homa-ir-recent`
```fhirpath
%context.observation
  .where(code.coding.exists(system = 'http://loinc.org' and code = '88110-5'))
  .where(effectiveDateTime > today() - 28 days)
  .sort(effectiveDateTime descending)
  .first()
  .valueQuantity.value
```

## Gates clínicos

### `gate-preparatoria-cumplido` (v0.2.0)
```fhirpath
%library.pcr-us-recent.exists() and %library.pcr-us-recent < 1.0
and %library.psqi-recent.exists() and %library.psqi-recent <= 5
```
**Nota:** thresholds más estrictos en RC2 (hs-CRP <0.5).

### `gate-optimizacion-cumplido` (v0.2.0)
```fhirpath
%library.gate-preparatoria-cumplido
and %library.homa-ir-recent.exists() and %library.homa-ir-recent < 2.0
```
**Nota:** HOMA-IR <1.5 en RC2.

## Consent

### `consent-master-active`
```fhirpath
%context.consent
  .where(patient.reference = %context.patient.reference)
  .where(category.coding.exists(code = 'master-journey'))
  .where(status = 'active')
  .exists()
```

## TypeScript scoring functions

Las 6 scoring functions viven en `fhir/18-bots/shared/decision-logic/`:
- score-menopausia.ts — implementación completa
- score-cardio-metabolico.ts — implementación completa con bridge EPA
- score-longevidad-biohacking.ts — stub (sem 2)
- score-estetica-regenerativa.ts — stub (sem 2)
- score-deporte-running.ts — stub (sem 2)
- score-generico.ts — fallback

**Confidence calculation:**
```typescript
const gap = topScore - secondScore;
const gapFactor = 0.5 + 0.5 * Math.tanh(gap * 5);
const confidence = topScore * gapFactor;
```

Threshold para invocar Capa 2 LLM: `confidence < 0.75`.
