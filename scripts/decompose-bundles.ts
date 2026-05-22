/**
 * Descompone los 4 Bundles en archivos individuales (1 recurso = 1 archivo).
 * Evita el problema "Invalid id" de executeBatch usando createResource directo.
 *
 * Crea archivos en las mismas carpetas y RENOMBRA el Bundle original a .bak
 * para que deploy.ts no lo procese más.
 *
 * Run: npx tsx scripts/decompose-bundles.ts
 */

import { readFileSync, writeFileSync, renameSync } from 'fs';
import { join, dirname } from 'path';

const bundles = [
  'fhir/05-locations/locations.json',
  'fhir/06-devices/devices.json',
  'fhir/07-practitioners/practitioners.json',
  'fhir/08-practitionerroles/practitionerroles.json',
];

let totalExtracted = 0;

for (const bundlePath of bundles) {
  let content;
  try {
    content = JSON.parse(readFileSync(bundlePath, 'utf-8'));
  } catch {
    console.log(`⚠️  No pude leer ${bundlePath}, salteando`);
    continue;
  }

  if (!Array.isArray(content.entry)) {
    console.log(`⚠️  ${bundlePath} no tiene entries, salteando`);
    continue;
  }

  const dir = dirname(bundlePath);
  let count = 0;

  for (const entry of content.entry) {
    const resource = entry.resource;
    if (!resource?.resourceType || !resource?.id) continue;

    // Limpiar el recurso de cualquier campo que no deba ir
    const clean = { ...resource };

    const outPath = join(dir, `${resource.id}.json`);
    writeFileSync(outPath, JSON.stringify(clean, null, 2) + '\n');
    count++;
    totalExtracted++;
  }

  // Renombrar el Bundle original para que deploy.ts no lo procese
  renameSync(bundlePath, bundlePath + '.bak');
  console.log(`✓ ${bundlePath}: extraídos ${count} recursos individuales (Bundle → .bak)`);
}

console.log(`\n✅ ${totalExtracted} recursos individuales creados.`);
console.log('\nPróximo paso:');
console.log('  npm run deploy        (ahora los recursos van individuales, no en Bundle)');
console.log('  npx tsx scripts/verify.ts');
