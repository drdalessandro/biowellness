# CLAUDE.md — BIOWELLNESS FHIR Backend

> Onboarding para Claude Code y assistants agéntico operando este repo.

## Contexto

Este es el repositorio FHIR-as-Code de **BIOWELLNESS San Isidro**, centro de optimización biológica.

## Estructura

```
biowellness/
├── fhir/                  # FHIR-as-Code (recursos FHIR R4)
│   ├── 01-codesystems/
│   ├── 02-valuesets/
│   ├── ... (16 categorías)
│   └── 18-bots/          # Bot manifests + TypeScript
├── scripts/              # Deploy + validate
├── src/                  # Shared TypeScript
├── tests/                # Unit + integration
└── docs/                 # ADRs + runbooks
```

## Conventions

- Naming: PlanDefinitions `pd-`, ActivityDefinitions `ad-`, ObservationDefinitions `obs-def-`, AccessPolicies `ap-`
- Versioning: semver
- instantiatesCanonical: SIEMPRE pin version
- Provenance: crítico, no opcional

## Comandos

```bash
pnpm run validate
pnpm run deploy
pnpm test
```
