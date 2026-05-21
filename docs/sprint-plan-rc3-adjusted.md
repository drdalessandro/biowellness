# Sprint Plan RC3 — Ajustes por arquitectura dual frontend

> Cambios al sprint plan original de 6 semanas tras separación admin/clinical y diferimiento portal.
> Fecha objetivo go-live: **lunes 29 jun 2026**. Sin cambio.

## Resumen de impacto

| Componente | Antes RC3 | Post RC3 |
|---|---|---|
| Frontends a desarrollar | 1 mezclado (`app.biowellness.ar`) con chart + admin + portal | 2 separados: chart (custom) + admin (zero code, OSS) |
| Portal paciente | En MVP | Diferido a V2 (jul-ago) |
| Pantallas custom a desarrollar | ~22 | ~12 |
| Tiempo desarrollo frontend | 4 semanas full | 2.5 semanas |
| Tiempo desarrollo backend/Bots | 3 semanas | Sin cambio |
| Buffer pre-launch | 0.5 sem | 1.5 sem |

**Net effect: 1 semana adicional de buffer + reducción significativa de risk.**

## Cambios concretos por sprint

### Sprint 1 (sem 1: 19-25 may) — Infraestructura

**Tareas nuevas:**
- `S1.A` (nuevo): Setup Project `biowellness` en Medplum + 3 ClientApplications + CORS config + DNS para app.medplum.com.ar. Owner: Alejandro. 2h.
- `S1.B` (nuevo): Deploy Medplum App OSS a `app.medplum.com.ar` (build + S3 + CloudFront + ACM). Owner: Alejandro. 3h.
- `S1.C` (nuevo): Onboarding D1 y D2 a `medplum-chart-demo` repo + branding spec inicial. Owner: Alejandro + ambos devs. 4h.

**Tareas que cambian:**
- `S1.6` lab decision: **sin cambio**.
- `S1.11` frontend scaffolding: ahora es fork de `medplum-chart-demo` (no Vite from scratch). Owner: D1 + D2. 1 día (en vez de 2).

**Tareas eliminadas:**
- Original "diseño de pantallas admin" en frontend custom — Medplum App lo provee.
- Original "CRUD de AccessPolicies UI" — Medplum App lo provee.
- Original "ValueSet expansion UI" — Medplum App lo provee.

### Sprint 2 (sem 2: 26 may - 1 jun) — Backend + Frontend booking

**Tareas que cambian:**
- `S2.6` Frontend D1: booking flow. Reducido de 5 días → 3 días porque medplum-chart-demo ya tiene patient search, encounter creation, basic charting.
- `S2.7` Frontend D2: onboarding + perfil. Reducido de 5 días → 3 días.

**Tareas nuevas:**
- `S2.D` (nuevo): D1 + D2 implementan Radar BioTerrain (Recharts) en chart. 2 días.

**Tiempo recuperado:** ~4 días de bandwidth. Se reinvierte en pulido + tests.

### Sprint 3 (sem 3: 2-8 jun) — Bots + Chart médico

**Tareas que cambian:**
- `S3.4` portal patient: **eliminado del sprint**. Se difiere a V2.
- `S3.5` chart views médico: scope reducido — Medplum App cubre admin views. Foco solo en clinical workflows.

**Tareas nuevas:**
- `S3.E` (nuevo): D1 implementa Lab Ingestion Form (`q-lab-ingestion-panel-minimo`) en chart, con submit a Bot lab-ingestion. 2 días.
- `S3.F` (nuevo): D2 implementa Vista Fenotipo (display de scores Layer 1 + features con evidence + invocación de `$evaluate-fenotipo`). 2 días.

**Tiempo recuperado:** ~5 días (portal eliminado).

### Sprint 4 (sem 4: 9-15 jun) — Testing E2E

**Tareas nuevas:**
- `S4.G` (nuevo): Test E2E con paciente demo SOLO en chart médico + WhatsApp. Sin portal paciente. 2 días.
- `S4.H` (nuevo): Documentación operativa para staff: cómo usar Medplum App vs chart médico (qué tareas van en cada uno). 0.5 día.

### Sprint 5 (sem 5: 16-22 jun) — Soft launch

**Sin cambios estructurales.** Pero ahora hay 5 días adicionales de bandwidth ganados en sprints 2-4 que se reinvierten en:
- Más casos piloto (5-7 en vez de 2-3)
- Más tiempo de calibración con equipo médico
- Mejor preparación para 29 jun

### Sprint 6 (sem 6: 23-28 jun) — Pre-launch

**Sin cambios estructurales.**

## Lista actualizada de pantallas a desarrollar

### `app.biowellness.ar` (chart médico custom) — 12 pantallas

Numeración según wireframes E3 original:

| # | Pantalla | Status RC3 | Owner | Días |
|---|---|---|---|---|
| 1 | Booking público | KEEP, simplificada (medplum-chart-demo base) | D1 | 1 |
| 2 | Onboarding paciente (post-booking) | KEEP | D2 | 1.5 |
| 5 | Consent maestro firma | KEEP (Opción I del consent) | D2 | 1 |
| 6 | Cuestionario diagnóstico BioTerrain | KEEP | D2 | 1 |
| 11 | Chart paciente (overview) | KEEP, medplum-chart-demo base | D1 | 1 |
| 12 | Chart - Timeline | KEEP, medplum-chart-demo base | D1 | 0.5 |
| 13 | Chart - Radar BioTerrain | NUEVO custom | D1 | 2 |
| 17 | Chart - Vista Fenotipo | NUEVO custom | D2 | 2 |
| 18 | Lab Ingestion Form | NUEVO custom | D1 | 2 |
| 19 | Prescribir Plan (apply-plandefinition trigger) | NUEVO custom | D2 | 2 |
| 21 | Agenda del día (médicos) | KEEP simplificada | D1 | 1 |
| 22 | Secretaría view (gestión appointments) | KEEP simplificada | D2 | 1 |

**Total: ~16 días-hombre. Con 2 devs paralelos = ~8 días calendario en sprints 2-3.**

### `app.medplum.com.ar` (admin tooling)

**Cero desarrollo.** Lo provee Medplum upstream. Solo configuración:
- AccessPolicies para roles staff (provisto en RC2)
- Subscriptions para los 4 Bots (configurar en sem 2-3)
- CodeSystems / ValueSets browser (out of box)
- Bot debugger (out of box)
- AuditEvent viewer (out of box)

### `portal.biowellness.ar` (V2 jul-ago)

**No en sprint MVP.** Planning V2 separado post-launch.

### `www.biowellness.ar` (site público)

Webflow / Framer / Vite estático. **1 día calendario, D1 en sem 5.** No bloqueante.

## Tareas previas eliminadas (lo que se libera)

Originalmente en sprint plan:
- ~~Diseño de AccessPolicy editor UI~~ (Medplum App lo provee)
- ~~CodeSystem CRUD~~ (Medplum App lo provee)
- ~~ValueSet expansion test UI~~ (Medplum App lo provee)
- ~~Bot deployment + debugging UI~~ (Medplum App lo provee)
- ~~AuditEvent dashboard~~ (Medplum App lo provee)
- ~~Provenance viewer~~ (Medplum App lo provee)
- ~~Patient self-service portal (V1)~~ (Diferido a V2)
- ~~Wearable OAuth flow (V1)~~ (Diferido a V2)
- ~~Magic link auth paciente~~ (Diferido a V2)
- ~~Cuestionario self-completable pre-consulta~~ (Diferido a V2; se completa en consulta para MVP)

## Implicancias para equipo

### D1 y D2 (frontend devs)

- **Foco único:** chart médico custom en `app.biowellness.ar`. Sin distracción admin.
- **Ramp-up más rápido:** `medplum-chart-demo` ya tiene patrones FHIR, hooks de React, autenticación. Empezar de un working starter.
- **Menos scope = más tiempo de pulido.** Las 12 pantallas se pueden hacer en 2.5 sem con tiempo para revisiones.

### Alejandro

- **Tiempo recuperado en sem 1-3** porque no hay que diseñar admin UI custom.
- Mayor enfoque en: Bots + calibración clínica + setup Medplum Projects + AccessPolicies.

### Equipo médico

- Día 1 usan `app.biowellness.ar` para todo lo clínico (atender pacientes, prescribir, ver fenotipo).
- Si necesitan ver AuditEvents, gestión avanzada, edición de CodeSystems → eso va por `app.medplum.com.ar` (rol técnico, generalmente Alejandro o Claude Code, no médicos).

### Pacientes

- MVP: experiencia presencial + WhatsApp + email. **Sin portal.**
- Comunicación: el centro siente como un servicio premium analógico (alineado con expectativa ABC1).
- V2 (jul-ago): portal cuando ya hay base de pacientes establecida.

## Definition of Done actualizado por sprint

### Sprint 1 (sem 1) — Infraestructura completa

- [x] AWS infra: backend Medplum + admin app + DNS + TLS
- [x] Project `biowellness` creado con 2 ClientApplications (chart + admin)
- [x] Repo `biowellness-fhir` pusheado + RC1, RC2, RC3 mergeados
- [x] Repo `biowellness-chart` (fork de medplum-chart-demo) scaffolded + branding
- [x] FHIR-as-Code deployado a Project biowellness
- [x] `app.medplum.com.ar` operativo
- [x] Decisión lab cerrada
- [x] Sesión equipo médico programada

### Sprint 2-3 (sem 2-3) — Bots + Chart clínico

- [x] 4 Bots deployados + Subscriptions configuradas
- [x] Chart médico con: booking, onboarding, consent, cuestionario diagnóstico, chart overview, timeline
- [x] Radar BioTerrain implementado
- [x] Vista Fenotipo + Lab Ingestion implementados
- [x] WhatsApp + Email + MercadoPago integrados

### Sprint 4 (sem 4) — E2E

- [x] Paciente demo recorre journey completo en chart médico
- [x] WhatsApp notifications funcionando E2E
- [x] Bugs críticos resueltos
- [x] Staff entrenado

### Sprint 5 (sem 5) — Soft launch

- [x] 5-7 pacientes piloto (más que original 2-3 gracias al bandwidth recuperado)
- [x] Cero incidentes clínicos
- [x] Site público live

### Sprint 6 (sem 6) — Pre-launch

- [x] Buffer + monitoring
- [x] GO/NO-GO domingo 28 jun 18:00

## Riesgos actualizados

### Riesgos eliminados o reducidos

- ~~Risk: portal paciente no listo a tiempo~~ → diferido, no aplica
- ~~Risk: admin UI custom con bugs~~ → Medplum App es maduro, no aplica
- ~~Risk: scope creep en frontend~~ → scope mejor delimitado, riesgo menor

### Riesgos nuevos

- **Risk:** equipo médico debe aprender 2 herramientas (Medplum App + chart médico) en vez de 1. **Mitigación:** training session sem 4 separa claramente qué tareas van en cada uno. Documentación clara en `S4.H`.
- **Risk:** Project tenancy en Medplum poco probado por nuestro equipo. **Mitigación:** sem 1 dedicar tiempo a entender Projects + testing en staging Project antes de prod.
- **Risk:** ClientApplications mal configurados → CORS errors o auth failures. **Mitigación:** smoke test cada deploy + documentación step-by-step en runbook.

## Métricas de éxito por sprint actualizadas

| Sprint | Métrica primaria | Métrica secundaria |
|---|---|---|
| S1 | `app.medplum.com.ar` + `api.medplum.com.ar` operativos | Project biowellness con todos los recursos FHIR deployados |
| S2 | Bot lab-ingestion deploys con tests verdes | Chart médico fork building + auth OAuth funcional |
| S3 | Los 4 Bots con tests pasando | Vista fenotipo + Radar BioTerrain en chart |
| S4 | Paciente Demo journey completo | Staff entrenado en ambas herramientas (chart + admin) |
| S5 | 5-7 pilotos completaron journey | Cero incidentes clínicos |
| S6 | Sistema estable 48h | GO/NO-GO confirmed |

## Lo que necesito de vos antes de sprint 1

1. **Confirmar dominio medplum.com.ar registrado** (o registrarlo esta semana)
2. **Decidir si crear `biowellness-chart` repo separado o usar subdir de `biowellness-fhir`** — mi recomendación: separados (ciclos de deploy independientes)
3. **Confirmar D1 + D2 disponibles full-time desde sem 1** o ajustar capacity
4. **Habilitar Medplum CLI** localmente para poder deployar Bots desde dev machines
