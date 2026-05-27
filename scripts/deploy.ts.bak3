/**
 * BIOWELLNESS FHIR-as-Code deploy script — PRODUCTION ONLY
 *
 * Lee todos los JSON bajo fhir/ y los deploya al Project Medplum de producción.
 *
 * Usage:
 *   npm run deploy                 (deploy completo)
 *   npm run deploy -- --dry-run    (simula sin escribir)
 *   npm run deploy -- --filter=fhir/05-locations   (solo una carpeta)
 *
 * Variables requeridas en .env.local:
 *   MEDPLUM_BASE_URI       (default: https://api.medplum.com.ar)
 *   MEDPLUM_PROJECT_ID     (UUID del Project)
 *   MEDPLUM_CLIENT_ID      (ClientApplication con permisos de deploy)
 *   MEDPLUM_CLIENT_SECRET  (secret del ClientApplication)
 */

import { MedplumClient } from '@medplum/core';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// ─── Carga de .env.local (sin dependencias externas) ──────────────────
const loadEnv = (): void => {
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
    // Si no hay .env.local, usa variables de entorno del shell
  }
};

loadEnv();

// ─── Opciones de línea de comando ─────────────────────────────────────
interface DeployOptions {
  dryRun: boolean;
  filter?: string;
}

const parseArgs = (): DeployOptions => {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    filter: args.find((a) => a.startsWith('--filter='))?.split('=')[1],
  };
};

// ─── Main ─────────────────────────────────────────────────────────────
const main = async () => {
  const opts = parseArgs();

  const baseUri = process.env.MEDPLUM_BASE_URI ?? 'https://api.medplum.com.ar';
  const projectId = process.env.MEDPLUM_PROJECT_ID;
  const clientId = process.env.MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;

  if (!projectId) {
    console.error('❌ MEDPLUM_PROJECT_ID es requerido. Configuralo en .env.local');
    process.exit(1);
  }
  if (!clientId || !clientSecret) {
    console.error('❌ MEDPLUM_CLIENT_ID y MEDPLUM_CLIENT_SECRET son requeridos en .env.local');
    process.exit(1);
  }

  console.log('🏥 BIOWELLNESS FHIR Deploy (PRODUCTION)');
  console.log(`   Backend:    ${baseUri}`);
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Dry run:    ${opts.dryRun}`);
  if (opts.filter) console.log(`   Filter:     ${opts.filter}`);
  console.log('');

  const medplum = new MedplumClient({ baseUrl: baseUri });
  await medplum.startClientLogin(clientId, clientSecret);

  try {
    const profile = await medplum.getProfileAsync();
    console.log(`   ✓ Authenticated as: ${profile?.id ?? clientId}`);
  } catch {
    console.log(`   ✓ Authenticated (client ${clientId})`);
  }
  console.log('');

  const files = walkFhirDir('fhir', opts.filter);
  console.log(`📦 Found ${files.length} FHIR resources to deploy.`);
  console.log('');

  let succeeded = 0;
  let failed = 0;
  const failures: { file: string; error: string }[] = [];

  for (const file of files) {
    try {
      const content = JSON.parse(readFileSync(file, 'utf-8'));
      const resourceType = content.resourceType;
      const resourceId = content.id;

      if (!resourceType) throw new Error('Missing resourceType in JSON');

      console.log(`   📄 ${resourceType}/${resourceId ?? '(no id)'} (from ${file})`);

      if (opts.dryRun) {
        console.log('      [dry-run, skipping write]');
        succeeded++;
        continue;
      }

      if (resourceType === 'Bundle') {
        if (content.type !== 'transaction' && content.type !== 'batch') {
          throw new Error(`Bundle type '${content.type}' no soportado (usar 'transaction' o 'batch')`);
        }
        const response = await medplum.executeBatch(content);
        const entryCount = response.entry?.length ?? 0;
        const successEntries =
          response.entry?.filter((e: any) => e.response?.status?.startsWith('2')).length ?? 0;
        console.log(`      ✓ Bundle executed: ${successEntries}/${entryCount} entries succeeded`);

        const failedEntries =
          response.entry?.filter((e: any) => !e.response?.status?.startsWith('2')) ?? [];
        if (failedEntries.length > 0) {
          console.log(`      ⚠️  ${failedEntries.length} entries fallaron dentro del bundle:`);
          failedEntries.forEach((e: any, i: number) => {
            console.log(`         entry[${i}]: ${e.response?.status} - ${JSON.stringify(e.response?.outcome ?? {})}`);
          });
          throw new Error(`${failedEntries.length} entries fallaron`);
        }
      } else {
        if (!resourceId) throw new Error(`Resource ${resourceType} sin campo 'id'`);

        try {
          await medplum.readResource(resourceType, resourceId);
          await medplum.updateResource(content);
          console.log(`      ✓ Updated existing ${resourceType}/${resourceId}`);
        } catch {
        }
      }

      succeeded++;
    } catch (err: any) {
      const errorMsg = err?.outcome
        ? `${err.message} — ${JSON.stringify(err.outcome.issue ?? err.outcome)}`
        : err.message ?? String(err);
      console.error(`      ❌ Failed: ${errorMsg}`);
      failures.push({ file, error: errorMsg });
      failed++;
    }
  }

  console.log('');
  console.log(`✅ Deploy ${opts.dryRun ? 'dry-run ' : ''}complete: ${succeeded} succeeded, ${failed} failed.`);

  if (failures.length > 0) {
    console.log('');
    console.log('Failed files:');
    failures.forEach((f) => console.log(`   - ${f.file}: ${f.error}`));
  }

  process.exit(failed > 0 ? 1 : 0);
};

const walkFhirDir = (dir: string, filter?: string): string[] => {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'tests' || entry === 'dist') continue;
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...walkFhirDir(fullPath, filter));
    } else if (entry.endsWith('.json')) {
      if (!filter || fullPath.includes(filter)) {
        results.push(fullPath);
      }
    }
  }
  return results;
};

main().catch((err) => {
  console.error('💥 Unhandled error:', err);
  process.exit(1);
});
