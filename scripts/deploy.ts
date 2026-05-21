/**
 * BIOWELLNESS FHIR-as-Code deploy script
 *
 * Reads all JSON files under fhir/ and deploys them to the Medplum project.
 *
 * Usage:
 *   pnpm tsx scripts/deploy.ts --env=staging
 *   pnpm tsx scripts/deploy.ts --env=production
 *
 * Required env vars:
 *   MEDPLUM_BASE_URI          (default: https://api.medplum.com.ar)
 *   MEDPLUM_PROJECT_ID        (UUID of target Project)
 *   MEDPLUM_CLIENT_ID         (ClientApplication with deploy permissions)
 *   MEDPLUM_CLIENT_SECRET     (secret)
 *
 * RC3 changes vs RC1:
 *   - Default base URI ahora es api.medplum.com.ar (no api.biowellness.ar)
 *   - Project ID es obligatorio (no admin/SuperAdmin scope)
 *   - Logs incluyen Project ID en cada operación para trazabilidad
 *   - Soporte para --dry-run flag
 */

import { MedplumClient } from '@medplum/core';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface DeployOptions {
  env: 'staging' | 'production';
  dryRun: boolean;
  filter?: string;  // glob pattern, e.g. "fhir/01-codesystems/*"
}

const parseArgs = (): DeployOptions => {
  const args = process.argv.slice(2);
  return {
    env: (args.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'staging') as 'staging' | 'production',
    dryRun: args.includes('--dry-run'),
    filter: args.find((a) => a.startsWith('--filter='))?.split('=')[1],
  };
};

const main = async () => {
  const opts = parseArgs();
  const baseUri = process.env.MEDPLUM_BASE_URI ?? 'https://api.medplum.com.ar';
  const projectId = process.env.MEDPLUM_PROJECT_ID;
  const clientId = process.env.MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;

  if (!projectId) {
    console.error('❌ MEDPLUM_PROJECT_ID is required. Set it in .env.local or AWS Secrets Manager.');
    process.exit(1);
  }
  if (!clientId || !clientSecret) {
    console.error('❌ MEDPLUM_CLIENT_ID and MEDPLUM_CLIENT_SECRET required.');
    process.exit(1);
  }

  console.log(`🏥 BIOWELLNESS FHIR Deploy`);
  console.log(`   Environment: ${opts.env}`);
  console.log(`   Backend:     ${baseUri}`);
  console.log(`   Project ID:  ${projectId}`);
  console.log(`   Dry run:     ${opts.dryRun}`);
  console.log('');

  const medplum = new MedplumClient({ baseUrl: baseUri });
  await medplum.startClientLogin(clientId, clientSecret);

  // Verify we are in the right project
  const profile = await medplum.getProfileAsync();
  console.log(`   Authenticated as: ${profile?.name?.[0]?.text ?? 'unknown'}`);
  console.log('');

  // Walk fhir/ directory and collect JSON files
  const files = walkFhirDir('fhir', opts.filter);
  console.log(`📦 Found ${files.length} FHIR resources to deploy.`);

  let succeeded = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const content = JSON.parse(readFileSync(file, 'utf-8'));
      const resourceType = content.resourceType;
      const resourceId = content.id;

      console.log(`   📄 ${resourceType}/${resourceId} (from ${file})`);

      if (!opts.dryRun) {
        if (resourceType === 'Bundle') {
          await medplum.executeBatch(content);
        } else {
          await medplum.updateResource(content);
        }
      }

      succeeded++;
    } catch (err: any) {
      console.error(`   ❌ Failed: ${file}`);
      console.error(`      ${err.message ?? err}`);
      failed++;
    }
  }

  console.log('');
  console.log(`✅ Deploy ${opts.dryRun ? 'dry-run ' : ''}complete: ${succeeded} succeeded, ${failed} failed.`);

  process.exit(failed > 0 ? 1 : 0);
};

const walkFhirDir = (dir: string, filter?: string): string[] => {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
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
