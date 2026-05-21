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
