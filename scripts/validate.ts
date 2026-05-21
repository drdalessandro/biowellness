import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const walkDir = (dir: string): string[] => {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
};

const files = walkDir('fhir');
let errors = 0;

for (const file of files) {
  try {
    JSON.parse(readFileSync(file, 'utf-8'));
    console.log(`✓ ${file}`);
  } catch (e: any) {
    console.error(`✗ ${file}: ${e.message}`);
    errors++;
  }
}

console.log(`\n${files.length} files validated, ${errors} errors.`);
process.exit(errors > 0 ? 1 : 0);
