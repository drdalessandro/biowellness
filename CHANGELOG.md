# Changelog

## [Unreleased]

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
