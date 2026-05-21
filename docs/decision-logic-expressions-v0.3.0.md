# Decision Logic Expressions — v0.3.0 (RC2)

> Library version **0.3.0**. Cambios vs 0.2.0 documentados al final.
> Source of truth para FHIRPath expressions. Las versiones base64-encoded viven en
> `fhir/14-libraries/biowellness-decision-logic.json`.

**Status:** Draft — pendiente calibración por equipo médico (Conrado + Stephanie + Alejandro) sem 1-3 (ADR-030).

---

## Helpers nuevos en v0.3.0

### `hba1c-recent`
```fhirpath
%context.observation
  .where(code.coding.exists(system = 'http://loinc.org' and code = '4548-4'))
  .where(effectiveDateTime > today() - 90 days)
  .sort(effectiveDateTime descending)
  .first()
  .valueQuantity.value
```

### `lpa-recent`
```fhirpath
%context.observation
  .where(code.coding.exists(system = 'http://loinc.org' and code = '10835-7'))
  .sort(effectiveDateTime descending)
  .first()
  .valueQuantity.value
```
**Notar:** Lp(a) NO tiene window temporal — se mide una vez en la vida (genética). El valor más reciente es siempre válido.

### `igf1-recent`
```fhirpath
%context.observation
  .where(code.coding.exists(system = 'http://loinc.org' and code = '2484-4'))
  .where(effectiveDateTime > today() - 180 days)
  .sort(effectiveDateTime descending)
  .first()
  .valueQuantity.value
```

### `dheas-recent`
```fhirpath
%context.observation
  .where(code.coding.exists(system = 'http://loinc.org' and code = '2191-5'))
  .where(effectiveDateTime > today() - 180 days)
  .sort(effectiveDateTime descending)
  .first()
  .valueQuantity.value
```

### `homocisteina-recent`
```fhirpath
%context.observation
  .where(code.coding.exists(system = 'http://loinc.org' and code = '13965-9'))
  .where(effectiveDateTime > today() - 90 days)
  .sort(effectiveDateTime descending)
  .first()
  .valueQuantity.value
```

---

## Gates actualizados en v0.3.0 (thresholds más estrictos — ADR-029)

### `gate-preparatoria-cumplido` (v0.3.0)
```fhirpath
%library.pcr-us-recent.exists() 
  and %library.pcr-us-recent < 0.5        // PREVIOUSLY < 1.0
and %library.psqi-recent.exists() 
  and %library.psqi-recent <= 5
and %library.reactividad-digestiva-recent.exists() 
  and %library.reactividad-digestiva-recent < 8
```

### `gate-optimizacion-cumplido` (v0.3.0)
```fhirpath
%library.gate-preparatoria-cumplido
and %library.homa-ir-recent.exists() 
  and %library.homa-ir-recent < 1.5        // PREVIOUSLY < 2.0
and %library.egfr-recent.exists() 
  and %library.egfr-recent > 60
and %library.ggt-recent.exists() 
  and %library.ggt-recent < 50
and %library.hba1c-recent.exists()         // NEW component
  and %library.hba1c-recent < 5.2          // NEW threshold
and (
  (%context.patient.gender = 'male' 
    and %library.tg-hdl-recent-gendered < 2.0)
  or 
  (%context.patient.gender = 'female' 
    and %library.tg-hdl-recent-gendered < 1.5)
)
```

---

## Nuevos gates de seguridad pre-procedimiento

### `pre-ihht-seguro`
```fhirpath
// Sin ICC descompensada
%context.condition
  .where(code.coding.exists(system = 'http://snomed.info/sct' and code = '42343007'))
  .where(clinicalStatus.coding.exists(code = 'active'))
  .exists().not()

// Sin IAM en últimos 6 meses
and %context.condition
  .where(code.coding.exists(system = 'http://snomed.info/sct' and code = '22298006'))
  .where(onsetDateTime > today() - 180 days)
  .exists().not()

// TA basal en rango
and %library.ta-sistolica-recent < 180
and %library.ta-diastolica-recent < 110

// Sin EPOC IV
and %context.condition
  .where(code.coding.exists(system = 'http://snomed.info/sct' and code = '13645005'))
  .where(stage.summary.coding.exists(code = 'IV'))
  .exists().not()

// Sin TVP activa
and %context.condition
  .where(code.coding.exists(system = 'http://snomed.info/sct' and code = '128053003'))
  .where(clinicalStatus.coding.exists(code = 'active'))
  .exists().not()
```

### `pre-contraste-seguro`
```fhirpath
// Sin enf CV grave no estabilizada
%context.condition
  .where(category.coding.exists(code = 'cardiovascular-disease-severe'))
  .where(clinicalStatus.coding.exists(code = 'active'))
  .exists().not()

// Sin Raynaud severo
and %context.condition
  .where(code.coding.exists(system = 'http://snomed.info/sct' and code = '195295006'))
  .exists().not()

// Sin epilepsia no controlada
and %context.condition
  .where(code.coding.exists(system = 'http://snomed.info/sct' and code = '84757009'))
  .where(clinicalStatus.coding.exists(code = 'active'))
  .exists().not()
```

### `pre-hbot-seguro` (extendido en v0.3.0)
```fhirpath
%library.hbot-clearance-status-recent = 'cleared'

// Sin neumotórax activo
and %context.condition
  .where(code.coding.exists(system = 'http://snomed.info/sct' and code = '36118008'))
  .where(clinicalStatus.coding.exists(code = 'active'))
  .exists().not()

// Sin infección respiratoria aguda en últimos 14 días
and %context.condition
  .where(category.coding.exists(code = 'upper-respiratory-infection'))
  .where(onsetDateTime > today() - 14 days)
  .exists().not()

// Sin cirugía oído/nariz/tórax en últimos 30 días
and %context.procedure
  .where(code.coding.exists(code matches 'ear-surgery|nose-surgery|chest-surgery'))
  .where(performedDateTime > today() - 30 days)
  .exists().not()

// Sin marcapasos NO certificado HBOT
and %context.device
  .where(type.coding.exists(code = 'pacemaker'))
  .where(extension('https://biowellness.ar/fhir/StructureDefinition/iscca-hbot-certified').valueBoolean = false)
  .exists().not()

// Sin convulsiones no controladas
and %context.condition
  .where(code.coding.exists(system = 'http://snomed.info/sct' and code = '84757009'))
  .where(clinicalStatus.coding.exists(code = 'active'))
  .exists().not()

// Eustaquio permeable
and %context.observation
  .where(code.coding.exists(code = 'eustaquio-permeable'))
  .where(effectiveDateTime > today() - 1 day)
  .where(valueBoolean = true)
  .exists()
```

### `pre-suero-iv-seguro` (mantiene de v0.2.0, agregado check alergias)
```fhirpath
(%library.pcr-us-recent.empty() or %library.pcr-us-recent < 10)
and %library.ta-sistolica-recent >= 90
and %library.ta-sistolica-recent <= 180
and %library.ta-diastolica-recent >= 50
and %library.ta-diastolica-recent <= 110
and %library.glucemia-capilar-recent > 70
// NEW v0.3.0: chequeo de alergias declaradas
and %context.allergyIntolerance
  .where(clinicalStatus.coding.exists(code = 'active'))
  .where(criticality = 'high')
  .where(reaction.substance.coding.exists(code matches %activitySubstancesPattern))
  .exists().not()
```

---

## Gate nuevo: `evaluacion-medica-vigente` (ADR-031)

```fhirpath
// Encounter reciente (últimos 30 días) con un médico autorizado:
// director-medico (Conrado) o medico-programa (Stephanie / Alejandro)
%context.encounter
  .where(subject.reference = %context.patient.reference)
  .where(period.end > today() - 30 days)
  .where(
    participant.individual.resolve()
      .where($this is PractitionerRole)
      .where(code.coding.exists(
        system = 'https://biowellness.ar/fhir/CodeSystem/iscca-rol-staff'
        and (code = 'director-medico' or code = 'medico-programa')
      ))
      .exists()
  )
  .exists()
```

**Lógica:** retorna `true` si existe Encounter completado en últimos 30 días con cualquier médico autorizado para evaluar terapias biológicas. Esto materializa el backup flexible: en ausencia de Conrado, Stephanie o Alejandro pueden hacer la evaluación con misma autoridad.

**Validez 30 días por default.** Calibrable post-launch por equipo médico.

---

## Consent gates (mantienen de v0.2.0)

### `consent-master-active`
```fhirpath
%context.consent
  .where(patient.reference = %context.patient.reference)
  .where(category.coding.exists(code = 'master-journey'))
  .where(status = 'active')
  .exists()
```

### `consent-layer2-llm-granted`
**Cambio en v0.3.0:** la opt-in ahora se lee del Questionnaire response de la sección 7-bis.1 del consent master (Opción I — ADR-032), no de un sub-Consent separado.

```fhirpath
%context.questionnaireResponse
  .where(questionnaire = 'https://biowellness.ar/fhir/Questionnaire/q-consent-master')
  .where(status in ('completed' | 'amended'))
  .where(subject.reference = %context.patient.reference)
  .item.where(linkId = '7bis.1-layer2-ai')
  .answer.valueBoolean = true
```

### `consent-wearables-granted`
```fhirpath
%context.questionnaireResponse
  .where(questionnaire = 'https://biowellness.ar/fhir/Questionnaire/q-consent-master')
  .item.where(linkId = '7bis.2-wearables')
  .answer.valueBoolean = true
```

### `consent-crossorg-granted`
```fhirpath
%context.questionnaireResponse
  .where(questionnaire = 'https://biowellness.ar/fhir/Questionnaire/q-consent-master')
  .item.where(linkId = '7bis.3-cross-org')
  .answer.valueBoolean = true
```

### `consent-comm-whatsapp-granted` / `consent-comm-email-granted` / `consent-comm-sms-granted`
```fhirpath
%context.questionnaireResponse
  .where(questionnaire = 'https://biowellness.ar/fhir/Questionnaire/q-consent-master')
  .item.where(linkId = '7bis.4-comunicaciones')
  .answer.valueString contains 'WhatsApp'    // o 'Email' / 'SMS'
```

### `consent-nivel-2-active-for-activity`
**Sin cambios** estructurales, sigue siendo Consent separado por activity nivel-2.

### `consent-nivel-3-active-for-activity`
**Sin cambios** estructurales, sigue siendo Consent separado por activity nivel-3.

---

## Resumen cambios v0.2.0 → v0.3.0

| Categoría | Cambio |
|---|---|
| Threshold hs-CRP gate-preparatoria | <1.0 → **<0.5** (ADR-029) |
| Threshold HOMA-IR gate-optimización | <2.0 → **<1.5** (ADR-029) |
| Component HbA1c en gate-optimización | nuevo, **<5.2%** |
| Helpers nuevos | hba1c, lpa, igf1, dheas, homocisteina |
| Gate seguridad nuevo | `pre-ihht-seguro` (5 contraindicaciones) |
| Gate seguridad nuevo | `pre-contraste-seguro` (3 contraindicaciones) |
| Gate `pre-hbot-seguro` extendido | + neumotórax, infección respiratoria, cirugía 30d, marcapasos NO HBOT, convulsiones |
| Gate `pre-suero-iv-seguro` extendido | + chequeo alergias declaradas |
| Gate nuevo `evaluacion-medica-vigente` | 30 días, backup flexible Stephanie/Alejandro (ADR-031) |
| Consent opt-ins | leídos de Questionnaire q-consent-master sección 7-bis (Opción I, ADR-032) |
| Scoring functions TS | sin cambios estructurales, pesos pendientes calibración equipo médico (ADR-030) |
| Source attribution | Lapeire pasa a "referencia bibliográfica" (ADR-025) |
