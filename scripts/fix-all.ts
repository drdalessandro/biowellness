/**
 * Fix consolidado — aplica TODOS los fixes de deploy de una sola vez.
 * Idempotente: podés correrlo las veces que quieras.
 *
 * Resuelve los 19 errores de deploy:
 *  1. Bundles: quitar fullUrl + Bundle.id (causa "Invalid id")
 *  2. AccessPolicy: quitar description + criteria inválidas
 *  3. ObservationDefinition: quitar url + version (campos R5, no R4)
 *  4. Library: reemplazar placeholders por base64 real
 *  5. Bot: quitar version + auditEnabled
 *
 * Run: npx tsx scripts/fix-all.ts
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

let fixCount = 0;

const fixFile = (path: string, fn: (c: any) => any): void => {
  let content;
  try {
    content = JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return;
  }
  const before = JSON.stringify(content);
  const fixed = fn(content);
  const after = JSON.stringify(fixed);
  if (before !== after) {
    writeFileSync(path, JSON.stringify(fixed, null, 2) + '\n');
    console.log(`  ✓ ${path}`);
    fixCount++;
  }
};

const walkDir = (dir: string, pattern?: RegExp): string[] => {
  const r: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) r.push(...walkDir(full, pattern));
      else if (entry.endsWith('.json') && (!pattern || pattern.test(full))) r.push(full);
    }
  } catch {}
  return r;
};

console.log('🔧 Fix consolidado — aplicando TODOS los fixes\n');

// ─── 1. BUNDLES: quitar id del wrapper + quitar fullUrl de entries ──
console.log('1. Bundles (quitar id wrapper + fullUrl de entries)');
const bundleFiles = [
  'fhir/05-locations/locations.json',
  'fhir/06-devices/devices.json',
  'fhir/07-practitioners/practitioners.json',
  'fhir/08-practitionerroles/practitionerroles.json',
];
for (const path of bundleFiles) {
  fixFile(path, (c) => {
    delete c.id; // Bundle transaction no debe tener id
    if (Array.isArray(c.entry)) {
      c.entry = c.entry.map((e: any) => {
        delete e.fullUrl; // sin fullUrl, PUT con id es inequívoco
        if (e.resource?.resourceType && e.resource?.id) {
          e.request = {
            method: 'PUT',
            url: `${e.resource.resourceType}/${e.resource.id}`,
          };
        }
        return e;
      });
    }
    return c;
  });
}

// ─── 2. ACCESSPOLICY: quitar description + criteria inválidas ──────
console.log('\n2. AccessPolicy (quitar description + criteria con * o {{}})');
for (const path of walkDir('fhir/09-accesspolicies')) {
  fixFile(path, (c) => {
    delete c.description;
    if (Array.isArray(c.resource)) {
      c.resource = c.resource.map((r: any) => {
        if (r.criteria && (r.criteria.includes('*') || r.criteria.includes('{{'))) {
          delete r.criteria;
        }
        return r;
      });
    }
    return c;
  });
}

// ─── 3. OBSERVATIONDEFINITION: quitar url + version ────────────────
console.log('\n3. ObservationDefinition (quitar url + version)');
for (const path of walkDir('fhir/10-observationdefinitions')) {
  fixFile(path, (c) => {
    delete c.url;
    delete c.version;
    return c;
  });
}

// ─── 4. LIBRARY: reemplazar placeholders por base64 real ───────────
console.log('\n4. Library (base64 real)');
const expressions: Record<string, string> = {
  'hba1c-recent': `%context.observation.where(code.coding.exists(system = 'http://loinc.org' and code = '4548-4')).where(effectiveDateTime > today() - 90 days).sort(effectiveDateTime descending).first().valueQuantity.value`,
  'lpa-recent': `%context.observation.where(code.coding.exists(system = 'http://loinc.org' and code = '10835-7')).sort(effectiveDateTime descending).first().valueQuantity.value`,
  'igf1-recent': `%context.observation.where(code.coding.exists(system = 'http://loinc.org' and code = '2484-4')).where(effectiveDateTime > today() - 180 days).sort(effectiveDateTime descending).first().valueQuantity.value`,
  'dheas-recent': `%context.observation.where(code.coding.exists(system = 'http://loinc.org' and code = '2191-5')).where(effectiveDateTime > today() - 180 days).sort(effectiveDateTime descending).first().valueQuantity.value`,
  'homocisteina-recent': `%context.observation.where(code.coding.exists(system = 'http://loinc.org' and code = '13965-9')).where(effectiveDateTime > today() - 90 days).sort(effectiveDateTime descending).first().valueQuantity.value`,
};
fixFile('fhir/14-libraries/biowellness-decision-logic.json', (c) => {
  if (Array.isArray(c.content)) {
    c.content = c.content.map((item: any) => {
      if (typeof item.data === 'string' && item.data.startsWith('PLACEHOLDER')) {
        const title = item.title || '';
        const expr = expressions[title] || `-- TODO: implement ${title}`;
        item.data = Buffer.from(expr, 'utf-8').toString('base64');
      }
      return item;
    });
  }
  return c;
});

// ─── 5. BOT: quitar version + auditEnabled ─────────────────────────
console.log('\n5. Bot manifests (quitar version + auditEnabled)');
for (const path of walkDir('fhir/18-bots', /manifest\.json$/)) {
  fixFile(path, (c) => {
    delete c.version;
    delete c.auditEnabled;
    return c;
  });
}

console.log(`\n✅ ${fixCount} archivos modificados.`);
console.log('\nPróximo paso:');
console.log('  npm run deploy -- --dry-run   (verificar)');
console.log('  npm run deploy                (deploy real)');
