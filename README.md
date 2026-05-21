# BIOWELLNESS — FHIR Backend Configuration

> Centro de Optimización Biológica BIOWELLNESS San Isidro
> Razón social: Shanti Om SRL
> Apertura: 29 jun 2026

Repositorio FHIR-as-Code para BIOWELLNESS. Modela todos los recursos FHIR R4 que se deployan al backend Medplum.

## Quick start

```bash
git clone https://github.com/drdalessandro/biowellness.git
cd biowellness
pnpm install
cp .env.example .env.local
# Editar .env.local
pnpm run validate
```

## Documentación

- `docs/architecture-decisions.md` — ADRs históricos
- `docs/decision-logic-expressions.md` — Lógica clínica
- `RC1-README.md` — Este delta + roadmap RC2/RC3

## Status

- RC1 (este merge): Library v0.2.0 + Bot designs + 10 ADRs
- RC2 (próximo): BIOWELLNESS reframing + staff + combos + 7 ADRs
- RC3 (después): Medplum Projects + dual frontend + 4 ADRs

Target go-live: 29 jun 2026.
