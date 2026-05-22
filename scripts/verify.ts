/**
 * Verify deploy — cuenta recursos por tipo en el Project configurado
 *
 * Usa las MISMAS variables que deploy.ts (.env.local).
 * Muestra a qué Project apunta y compara esperado vs real.
 *
 * Run: npx tsx scripts/verify.ts
 *      npx tsx scripts/verify.ts --env=production
 */

import { MedplumClient } from '@medplum/core';
import { readFileSync } from 'fs';

// Carga simple de .env.local (sin dependencias externas)
const loadEnv = () => {
  try {
    const content = readFileSync('.env.local', 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.log('(no .env.local encontrado, usando variables de entorno)');
  }
};

loadEnv();

const args = process.argv.slice(2);
const envArg = args.find((a) => a.startsWith('--env='))?.split('=')[1];
const env = (envArg || process.env.DEPLOY_ENV || 'production').toUpperCase();

const getVar = (name: string): string | undefined =>
  process.env[`${name}_${env}`] ?? process.env[name];

const baseUri = getVar('MEDPLUM_BASE_URI') ?? 'https://api.medplum.com.ar';
const projectId = getVar('MEDPLUM_PROJECT_ID');
const clientId = getVar('MEDPLUM_CLIENT_ID');
const clientSecret = getVar('MEDPLUM_CLIENT_SECRET');

const expected: Record<string, number> = {
  CodeSystem: 3,
  StructureDefinition: 1,
  Organization: 1,
  Location: 15,
  Device: 11,
  Practitioner: 8,
  PractitionerRole: 9,
  AccessPolicy: 2,
  ObservationDefinition: 8,
  ActivityDefinition: 7,
  Library: 1,
  PlanDefinition: 5,
  Questionnaire: 1,
  Bot: 4,
};

(async () => {
  console.log('🔍 BIOWELLNESS Deploy Verification');
  console.log(`   Backend:    ${baseUri}`);
  console.log(`   Project ID: ${projectId ?? '(NO CONFIGURADO)'}`);
  console.log(`   Client ID:  ${clientId ?? '(NO CONFIGURADO)'}`);
  console.log('');

  if (!clientId || !clientSecret) {
    console.error('❌ Falta MEDPLUM_CLIENT_ID o MEDPLUM_CLIENT_SECRET en .env.local');
    process.exit(1);
  }

  const medplum = new MedplumClient({ baseUrl: baseUri });
  await medplum.startClientLogin(clientId, clientSecret);

  console.log('Recurso                    Esperado  Real   Status');
  console.log('──────────────────────────────────────────────────');

  let allOk = true;
  let totalReal = 0;

  for (const [type, exp] of Object.entries(expected)) {
    try {
      const result = await medplum.search(type as any, { _summary: 'count' });
      const real = result.total ?? 0;
      totalReal += real;
      const status = real >= exp ? '✓ OK' : '✗ FALTA';
      if (real < exp) allOk = false;
      console.log(
        `${type.padEnd(26)} ${String(exp).padEnd(9)} ${String(real).padEnd(6)} ${status}`,
      );
    } catch (err: any) {
      console.log(`${type.padEnd(26)} ${String(exp).padEnd(9)} ERROR  ✗ ${err.message}`);
      allOk = false;
    }
  }

  console.log('──────────────────────────────────────────────────');
  console.log(`Total recursos encontrados: ${totalReal}`);
  console.log('');
  console.log(
    allOk
      ? '✅ Todo cargado correctamente en este Project.'
      : '⚠️  Faltan recursos en este Project (o estás apuntando al Project equivocado).',
  );
})().catch((err) => {
  console.error('💥 Error:', err.message);
  process.exit(1);
});
