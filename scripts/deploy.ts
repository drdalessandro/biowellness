/**
 * BIOWELLNESS FHIR-as-Code deploy script
 * Note: this is RC1 base. RC3 update adds Project ID support.
 */
import { MedplumClient } from '@medplum/core';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const baseUri = process.env.MEDPLUM_BASE_URI ?? 'https://api.medplum.com.ar';
const clientId = process.env.MEDPLUM_CLIENT_ID;
const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('MEDPLUM_CLIENT_ID and MEDPLUM_CLIENT_SECRET required.');
  process.exit(1);
}

const medplum = new MedplumClient({ baseUrl: baseUri });

const walk = (dir: string): string[] => {
  const r: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) r.push(...walk(p));
    else if (entry.endsWith('.json')) r.push(p);
  }
  return r;
};

(async () => {
  await medplum.startClientLogin(clientId!, clientSecret!);
  const files = walk('fhir');
  for (const f of files) {
    const r = JSON.parse(readFileSync(f, 'utf-8'));
    if (r.resourceType === 'Bundle') {
      await medplum.executeBatch(r);
    } else {
      await medplum.updateResource(r);
    }
    console.log(`✓ ${r.resourceType}/${r.id}`);
  }
})();
