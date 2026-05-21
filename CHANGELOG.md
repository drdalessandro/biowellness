# Changelog

## [Unreleased]
## [0.3.0] - 2026-05-19 - RC2 BIOWELLNESS reframing

Major reframing of project after staff confirmation + legal consent document.

### Added
- ADR-025: Framework convergence (BIOWELLNESS propia, ISSCA bibliográfico)
- ADR-026: Dual entry model (Vía A journey, Vía B combo directo VIP)
- ADR-027: Definitive staff with dual roles (Nikita HBOT+osteo)
- ADR-028: Core tech day 1: 3 HBOT chambers (7 spots), 2 IHHT, Recovery Pro
- ADR-029: Stricter clinical thresholds (hs-CRP <0.5, HOMA <1.5)
- ADR-030: Calibration by medical team continuous (supersedes ADR-020)
- ADR-031: Director Médico backup flexible (Stephanie/Alejandro)
- ADR-032: Master Consent Opción I (real legal document + digital opt-ins)
- 5 PlanDefinitions for BIO combos (energy, recovery, balance, iv-boost, elite)
- 5 ActivityDefinitions for new technologies (IHHT, Recovery Pro, red light, botas, masaje, yoga)
- 8 ObservationDefinitions for new biomarkers (HbA1c, Lp(a), homocisteína, IGF-1, DHEA-S, cortisol, testosterona, ácido úrico)
- 15 Locations per architectural plans (Sofía Tellez Adba)
- 11 Devices (3 HBOT + 2 IHHT + sauna + cold + red light + 2 botas)
- 9 PractitionerRoles (Nikita with 2)
- 1 new AccessPolicy (ap-director-medico)
- 1 new CodeSystem (bw-combo)
- 1 new Extension (iscca-requires-medical-evaluation)

### Changed
- Library 0.2.0 → 0.3.0 with new thresholds and gates
- q-consent-master replaced with legal document Opción I (Shanti Om SRL)
- Organization with Shanti Om SRL data + Roque Sáenz Peña 530
- 8-Practitioner bundle with real names (Conrado, Stephanie, Alejandro, Varela, Nikita, Sívori, 2 secretarías)
- AccessPolicy ap-hiperbarista renamed → ap-hbot-operator

### Pending
- Calibración del equipo médico (Conrado + Stephanie + Alejandro) sem 1-3


## [0.2.0] - 2026-05-19 - RC1 Library + Bots design

### Added
- Library biowellness-decision-logic v0.2.0 with FHIRPath expressions inline
- TypeScript scoring functions for Layer 1 fenotipado:
  - score-menopausia.ts (complete)
  - score-cardio-metabolico.ts (complete, with EPA LE8 bridge)
  - 4 other profiles (stubs for sem 2 completion)
- compute-fenotipo-confidence + select-dominant-profile (complete)
- Test suites for menopausia + confidence/selection
- Bot manifests + READMEs for: apply-plandefinition, evaluate-fenotipo, lab-ingestion, gate-evaluator
- 10 new ADRs (015-024) covering all post-bootstrap design decisions
- Bootstrap files: package.json, tsconfig.json, .env.example, README, CLAUDE.md

### Status
- Design complete, implementation pending for sem 2-3
- Calibration with medical team pending (ADR-020)
- RC2 and RC3 to follow with framework reframing + deployment architecture

## [0.1.0] - bootstrap
Initial structure.
