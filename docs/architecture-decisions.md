# Architecture Decision Records

> Histórico de decisiones arquitectónicas de BIOWELLNESS FHIR Backend.

## ADR-001 — FHIR R4 sobre Medplum self-hosted
**Status:** Accepted

Plataforma elegida: Medplum self-hosted en AWS con FHIR R4 como estándar.

## ADR-002 — TypeScript polyglot para Bots
**Status:** Accepted

Bots se implementan en TypeScript ejecutándose en AWS Lambda. Comparten patterns via shared/ folder.

## ADR-003 — FHIR-as-Code paradigm
**Status:** Accepted

Todos los recursos FHIR (CodeSystems, ValueSets, Bots, AccessPolicies, etc.) se versionan como JSON en este repo y se deploya vía scripts/deploy.ts. No edits directos en producción.

---

(Ver `architecture-decisions-delta-rc1.md` para ADRs 015-024 que se integran tras merge RC1.)


# Architecture Decision Records — Delta RC1

> ADRs 015-024 — diseñados post-bootstrap, agregados al doc principal en RC1.

---

## ADR-015: Laboratorio externo genérico inicialmente

**Fecha:** 2026-05-18 · **Status:** Accepted (provisional)

**Decisión:** El sistema arranca sin convenio formal con laboratorio específico. Cada paciente recibe orden papel y lleva a lab de su elección. ServiceRequest registra solo el código de pruebas, no el provider específico.

**Justificación:** No bloquea timeline 29 jun. Decisión final (Manlab vs Hidalgo vs Genia vs combinación) se pospone a sem 2-3 cuando haya datos operativos reales de volumen y mix.

**Implicancias:**
- Ingreso de resultados es 100% manual (médico transcribe) en MVP
- OCR/digital intake diferido a V2 (julio-agosto)
- SpecimenDefinitions modelan tubos/condiciones genéricas, no provider-specific

---

## ADR-016: Anthropic Claude Sonnet 4 para Capa 2 LLM

**Fecha:** 2026-05-18 · **Status:** Accepted

**Decisión:** Uso de Anthropic Claude (modelo Sonnet 4) como provider de Layer 2 LLM en `evaluate-fenotipo`.

**Implicancias:**
- BAA con Anthropic recomendado pero NO bloqueante (Bundle se anonimiza pre-llamada)
- Cost: ~$0.10-0.30 USD por invocación de Capa 2. Volumen MVP <$3/día.

---

## ADR-017: Repo visibility - PRIVATE inicialmente

**Fecha:** 2026-05-18 · **Status:** Accepted

**Decisión:** Repositorio `drdalessandro/biowellness` queda privado durante MVP. Re-evaluación post-launch.

---

## ADR-018: EPA Bridge formal diferido a H2 2026

**Fecha:** 2026-05-18 · **Status:** Accepted

**Decisión:** Integración formal con EPA Bienestar IA (importación cross-organizacional) queda diferida a H2 2026. En MVP el sistema usa Patient + Consent.cross-org-import como placeholder.

---

## ADR-019: FHIRPath + TypeScript polyglot vs CQL puro

**Fecha:** 2026-05-18 · **Status:** Accepted

**Decisión:** Library `biowellness-decision-logic` usa estrategia polyglot:
- **FHIRPath** para checks binarios (gates, consent checks, safety pre-procedure)
- **TypeScript** para scoring numérico complejo (los 6 perfiles + confidence + selection)
- **CQL diferido** a Q4 cuando ecosystem madure

---

## ADR-020: Calibración clínica de scoring pendiente

**Fecha:** 2026-05-18 · **Status:** PENDING — sesión sem 2-3
**Nota RC2:** Superseded por ADR-030 (calibración continua por equipo médico, no sesión formal externa).

**Decisión inicial:** Los weights iniciales de cada componente de scoring son estimaciones razonables basadas en framework. Antes de go-live deben ser validados con calibración clínica.

---

## ADR-021: Bot apply-plandefinition - arquitectura Arq-C (orchestrator + helpers)

**Fecha:** 2026-05-18 · **Status:** Accepted

**Decisión:** Bot `apply-plandefinition` se implementa como orchestrator centralizado con helpers especializados invocados como funciones (no como sub-Bots independientes via eventos).

**Implicancias:**
- 5 módulos TS: orchestrator, action-walker, pre-flight, resource-instantiator, consent-generator, scheduling-proposer, provenance-recorder
- Sub-Bots invocables standalone también
- Si Arq-B se demuestra mejor en producción, migración progresiva viable

---

## ADR-022: Transacciones atómicas para writes, eventually consistent para side effects

**Fecha:** 2026-05-18 · **Status:** Accepted

**Decisión:** En Bots que generan múltiples resources:
- Bundle transaction atómica para los resources clínicos principales
- Eventually consistent para side effects (notificaciones WhatsApp/email, Provenance secundaria, metrics)

---

## ADR-023: instantiatesCanonical con version pin para auditoría

**Fecha:** 2026-05-18 · **Status:** Accepted

**Decisión:** Cada resource derivado lleva `instantiatesCanonical = [<AD.url>|<AD.version>]` con versión específica.

**Implicancia:** Cuando se actualiza ActivityDefinition de 0.1.0 a 0.2.0, los CarePlans activos siguen referenciando 0.1.0. Solo nuevos usan 0.2.0. No hay migration retroactive.

---

## ADR-024: gate-evaluator - debounce 5 seg para bulk uploads

**Fecha:** 2026-05-18 · **Status:** Accepted

**Decisión:** El Bot `gate-evaluator` implementa debounce in-memory de 5 segundos por patientId para evitar invocaciones múltiples cuando lab-ingestion sube 15 Observations en batch.


# Architecture Decision Records — Delta RC2

> ADRs 025-031 — diseñados en sesión RC2 (mayo 2026) con info real del proyecto:
> staff definitivo, framework reframing, planos físicos, consent legal real.

---

## ADR-025: Convergencia de framework — BIOWELLNESS adopta paradigma propio

**Fecha:** 2026-05-19 · **Status:** Accepted

**Decisión:** BIOWELLNESS San Isidro adopta una framework conceptual propia que **combina**:
- ISSCA como **referencia bibliográfica** (no operacional)
- Cleveland Clinic + Institute for Functional Medicine (IFM) para targets metabólicos
- Paradigma de hormesis y bioenergética mitocondrial
- Referencias clínicas de SHA Wellness, Lanserhof como benchmarks operativos

**Contexto:** El modelo previo asumía Dra. Lapeire como Scientific Director con framework ISSCA-céntrica. En realidad, Lapeire es advisor externa/conferenciante ISSCA, **no pertenece a BIOWELLNESS San Isidro**. El proyecto tiene Director Médico propio (Dr. Conrado López Alonso) y framework operacional propia.

**Implicancias técnicas:**
- Los CodeSystems con prefijo `iscca-*` **mantienen el naming** como referencia conceptual al framework de origen
- Los biomarkers/thresholds se amplían con marcadores de Cleveland Clinic/IFM que ISSCA original no enfatiza: GlycA, p16, Lp(a), IGF-1, DHEA-S, HbA1c, homocisteína
- `relatedArtifact[]` de la Library cita publicaciones ISSCA-Lapeire + Cleveland Clinic + AHA + estudios de hormesis (Thom et al. sobre HBOT y stem cells)
- Calibración clínica es **proceso continuo del equipo médico** (Conrado + Stephanie + Alejandro), no sesión formal con autor externo

---

## ADR-026: Modelo dual de entrada al sistema (journey vs combo directo)

**Fecha:** 2026-05-19 · **Status:** Accepted

**Decisión:** El sistema soporta DOS vías de entrada del paciente:

### Vía A — Journey personalizado (caso mayoritario)

```
Paciente nuevo → booking → primera entrevista 45-60 min con médico → 
screening metabólico (panel mínimo + avanzado) → 
Questionnaire diagnóstico digital (q-diagnostico-bioterrain) en sesión → 
asignación perfil clínico dominante (1 de 6) → 
matriz perfil×combo: médico prescribe combo(s) + intervenciones individuales → 
CarePlan instanciado con journey gateado (preparatoria → optimización → regenerativa)
```

Modelo comercial: **3-tier** (membresía mensual + combos como paquetes + intervenciones individuales).

### Vía B — Combo prescrito directo (excepción)

```
Paciente VIP / referido por Dr. Conrado / derivación externa con solicitud concreta →
primera entrevista corta de safety + objetivos → 
director (o médico backup) prescribe combo del catálogo →
labs solicitados solo para gates de seguridad pre-procedimiento →
combo instanciado vía Bot apply-plandefinition trigger=combo-directo →
sesiones repetibles sin journey gateado
```

Modelo comercial: **pago por servicio** (sin compromiso de membresía).

**Implicancias técnicas:**
- 5 nuevos PlanDefinitions `pd-combo-bio-*` (energy, recovery, balance, iv-boost, elite)
- Bot `apply-plandefinition` acepta nuevo trigger `combo-directo` que skipea cadena fenotipo→sub-plan
- ChargeItemDefinitions compartidas entre vías; diferencia es `Account.coverage` (Vía A tiene Coverage de membresía, Vía B no)
- Los 6 perfiles clínicos (`iscca-perfil-clinico`) **se mantienen** como assignment clínico; los 5 combos **se agregan** como opciones de intervención. Es matriz perfil × combo, NO reemplazo.

---

## ADR-027: Staff definitivo con roles duales

**Fecha:** 2026-05-19 · **Status:** Accepted

**Decisión:** Staff definitivo del centro:

| FHIR id | Persona | Rol(es) | AccessPolicy |
|---|---|---|---|
| BW-PRA-001 | Dr. Conrado López Alonso | Director Médico | `ap-director-medico` |
| BW-PRA-002 | Dra. Stephanie Dos Santos | Médica del programa | `ap-medico` |
| BW-PRA-003 | Dr. Alejandro Sergio D'Alessandro | Médico del programa | `ap-medico` |
| BW-PRA-004 | Evangelina Varela | HBOT operator | `ap-hbot-operator` |
| BW-PRA-005 | Nikita Boltruchek | **HBOT operator + Osteópata (DUAL)** | `ap-hbot-operator` + `ap-osteopata` |
| BW-PRA-006 | Lic. Diego Sívori | Nutricionista | `ap-nutricionista` |
| BW-PRA-007 | Secretaría 1 (TBD) | Secretaría | `ap-secretaria` |
| BW-PRA-008 | Secretaría 2 (TBD) | Secretaría | `ap-secretaria` |

**Roles duales (Nikita):** se modela como **1 Practitioner con 2 PractitionerRoles activos simultáneamente**. El AccessPolicy aplicable se determina por el contexto del Encounter (si es HBOT → ap-hbot-operator; si es osteopatía → ap-osteopata).

---

## ADR-028: Tecnologías core operativas día 1

**Fecha:** 2026-05-19 · **Status:** Accepted

**Decisión:** Las siguientes tecnologías están operativas el **29 jun 2026** (MVP):

### Capacidad física confirmada (planos Sofía Tellez Adba "En espiral Arquitectura"):

**Planta baja:**
- 1 cámara HBOT monoplaza (1 lugar)
- 1 cámara HBOT multiplaza A (4 lugares)
- 1 cámara HBOT multiplaza B (2 lugares)
- **Total HBOT: 7 lugares simultáneos**
- 2 equipos IHHT Longfian Jay 20H
- 2 gabinetes Recovery Pro (sauna + cold plunge + red light por circuito)
- Recepción + secretarías

**Entrepiso:**
- Sala infusión IV con 3 puestos (sillón + pie de suero)
- 2 camillas botas de compresión + crioterapia integrada
- Sala osteopatía (Nikita)
- Sala red light independiente
- Guardado bolsos + desecho toallas

**Implicancia operativa:** Bottleneck deja de ser cámara HBOT (5/día previa estimación) y pasa a ser **disponibilidad de operators** (Varela + Boltruchek alternándose). Capacidad teórica ~30-35 sesiones HBOT/día con staffing adecuado.

---

## ADR-029: Thresholds clínicos más estrictos (BIOWELLNESS premium)

**Fecha:** 2026-05-19 · **Status:** Accepted

**Decisión:** Los thresholds de gates clínicos se ajustan al estándar premium del centro (segmento ABC1, comparable SHA/Lanserhof):

| Marcador | Threshold anterior (Library 0.2.0) | Threshold BIOWELLNESS (Library 0.3.0) | Source |
|---|---|---|---|
| hs-CRP (gate-preparatoria) | <1.0 mg/L | **<0.5 mg/L** | Documento maestro BIOWELLNESS |
| HOMA-IR (gate-optimización) | <2.0 | **<1.5** | Cleveland Clinic + IFM |
| Glucosa ayunas (óptimo) | <100 mg/dL | **<85 mg/dL** | Documento maestro |
| HbA1c (óptimo) | no modelado | **<5.2%** | Documento maestro |
| TG/HDL ratio | <2.0 M / <1.5 F | igual | mantiene |
| Homocisteína | no modelado | **<7 µmol/L** | Documento maestro |
| eGFR (gate-optimización) | >60 mL/min/1.73m² | igual | mantiene |

**Riesgo conocido:** thresholds más exigentes pueden generar pacientes "estancados" en preparatoria por períodos largos. **Mitigación:** revisión por equipo médico post-launch primer trimestre con discrepancias gate-no-cumplido vs juicio clínico.

**Library bumpea de 0.2.0 → 0.3.0** con estos thresholds + el ADR-020 actualizado.

---

## ADR-030: ADR-020 actualizado — Calibración clínica continua por equipo médico

**Fecha:** 2026-05-19 · **Status:** Supersedes ADR-020 (sesión Lapeire)

**Decisión:** La calibración del Library decision-logic es **proceso continuo del equipo médico** del centro:

- **Calibración inicial (sem 1-3):** revisión asíncrona de `docs/decision-logic-expressions.md` por cada médico (Conrado + Stephanie + Alejandro) en su tiempo. 1 reunión de equipo médico de 60-90 min (no 2h obligatorias) para alinear thresholds finales.
- **Validación durante soft launch (sem 4-5):** observación de casos piloto reales que cada médico trae. Cada médico anota discrepancias entre algoritmo y juicio clínico.
- **Calibración trimestral post-launch:** revisión de Observations con code `fenotipado-discrepancia` o `gate-discrepancia` acumuladas en últimos 90 días. Ajuste de weights y/o thresholds. Bump de Library a 0.4.0+.

**Diferencia con ADR-020 original:** no es sesión formal con Scientific Director externo (Lapeire). Es proceso colaborativo del equipo médico que trabaja en el centro día a día.

---

## ADR-031: Responsabilidades del Director Médico y backup flexible

**Fecha:** 2026-05-19 · **Status:** Accepted

**Decisión:** El Director Médico (Conrado López Alonso) tiene responsabilidades clínicas específicas conforme al Consentimiento Informado legal (Versión 1.0 Abril 2026):

### Responsabilidades únicas del Director Médico
- **Evaluación previa obligatoria** para todas las terapias biológicas (servicios punto 5 del consent: sueros IV especializados, PRP, péptidos, exosomas, células madre)
- Validación de PlanDefinitions complejos en pacientes con múltiples capas comprometidas
- Backup clínico en caso de evento adverso

### Backup flexible (en ausencia del Director)
Los **médicos del programa** (Dra. Stephanie Dos Santos o Dr. Alejandro D'Alessandro) pueden hacer la evaluación con **misma autoridad**, sin diferir la atención del paciente.

### Implementación FHIR
- Nueva Extension `iscca-requires-medical-evaluation` (boolean, sobre ActivityDefinition)
- Bot `apply-plandefinition` pre-flight verifica: existe `Encounter` con `participant.actor` perteneciente a `PractitionerRole` con role en `{director-medico, medico-programa}` en últimos **30 días** (calibrable post-launch)
- Si no existe: bloquea instanciación + crea Task "Agendar evaluación médica antes de iniciar terapia biológica"
- AccessPolicy `ap-director-medico` es superset de `ap-medico` (todo lo que un médico hace, el director también; al revés no)

**Validez de la evaluación:** 30 días por default. Calibrable por equipo médico post-launch según práctica real.

---

## ADR-032: Master Consent adopta documento legal real (Opción I)

**Fecha:** 2026-05-19 · **Status:** Accepted, supersedes design D2

**Decisión:** El `Questionnaire/q-consent-master` adopta como base el **Consentimiento Informado legal redactado** (Versión 1.0 Abril 2026, Shanti Om SRL). Las opt-ins digitales (IA Capa 2, wearables, EPA bridge, comunicaciones) se agregan como sección 7-bis sin alterar la estructura legal aprobada.

**Razón:** el documento legal ya tiene revisión por abogado de la SRL. Reemplazarlo por estructura de 10 secciones diseñada en D2 perdería esa solidez legal y obligaría a re-revisión. La Opción I preserva integridad legal Y agrega capabilities digitales mínimas necesarias.

**Estructura final del Consent:**
1. Datos del Cliente
2. Descripción de los Servicios (9 servicios canónicos)
3. Declaración de Estado de Salud
4. Contraindicaciones Absolutas y Relativas (mapeadas a FHIRPath gates de seguridad)
5. Riesgos y Efectos Adversos Posibles
6. Normas de Conducta y Seguridad
7. Privacidad y Tratamiento de Datos Personales (Ley 25.326)
7-bis. **Autorizaciones Digitales Adicionales** (NUEVO):
   - 7-bis.1 — IA Capa 2 (LLM para análisis complejo de fenotipo)
   - 7-bis.2 — Sincronización con wearables (Oura, Apple Health)
   - 7-bis.3 — Importación cross-organizacional (EPA Bienestar IA bridge)
   - 7-bis.4 — Canales de comunicación (WhatsApp / email / SMS)
8. Declaración Final y Consentimiento (firma única cubre todas las secciones)

**El cliente firma una sola vez en sección 8.** Compatible con uso en papel.
