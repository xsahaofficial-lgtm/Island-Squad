import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const slugAt = args.indexOf('--slug');
const slug = slugAt >= 0 ? args[slugAt + 1] : null;
const name = args.find((a, i) => !a.startsWith('--') && !(slugAt >= 0 && i === slugAt + 1));

const usage = 'Usage: npm run rename -- "New Game Name" [--slug new-app-name] [--dry]';
if (!name) { console.error(usage); process.exit(1); }
if (!/^[A-Za-z0-9][A-Za-z0-9 '&.!-]{1,28}[A-Za-z0-9!.]$/.test(name) || /\s{2,}/.test(name) || !/[A-Za-z]/.test(name)) {
  console.error('The name must be 3 to 30 characters: letters, numbers, spaces and \' & . ! - only.');
  process.exit(1);
}
if (slug !== null && !/^[a-z][a-z0-9-]{1,19}$/.test(slug)) {
  console.error('The app name (slug) must be lowercase letters, numbers and hyphens, starting with a letter, max 20 characters.');
  process.exit(1);
}

const brandFile = 'src/shared/brand.ts';
const brand = fs.readFileSync(brandFile, 'utf8');
const match = brand.match(/export const GAME_NAME = (['"])(.*?)\1;/);
if (!match) { console.error(`Could not find GAME_NAME in ${brandFile}`); process.exit(1); }
const oldName = match[2];
if (oldName === name && slug === null) { console.log('Nothing to change, that is already the name.'); process.exit(0); }

const targets = ['README.md', 'LICENSE', 'package.json', 'devvit.json', ...fs.readdirSync('docs').filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)];
const changed = [];
const write = (file, text) => { if (!dry) fs.writeFileSync(file, text); changed.push(file); };

write(brandFile, brand.replace(match[0], `export const GAME_NAME = ${JSON.stringify(name)};`));
for (const file of targets) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replaceAll(oldName, name).replaceAll(oldName.toUpperCase(), name.toUpperCase());
  if (after !== before) write(file, after);
}
if (slug !== null) {
  for (const file of ['devvit.json', 'package.json']) {
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(/("name":\s*")[^"]*(")/, `$1${slug}$2`);
    if (after !== before) write(file, after);
  }
}
if (!dry) {
  execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', 'scripts/sync-products.mjs'], { stdio: 'inherit' });
  changed.push('src/products.json');
}

console.log(`${dry ? 'Would rename' : 'Renamed'} "${oldName}" to "${name}" in:`);
[...new Set(changed)].forEach((f) => console.log('  ' + f));
if (slug !== null) console.log(`\nApp name (slug) set to "${slug}". Only do this before your first "devvit upload": Reddit can't rename an app once it exists.`);
else console.log('\nThe Reddit app name (the "name" in devvit.json) was not touched. Reddit fixes it when the app is created.');
console.log('Next: npm run build, then npm run launch to send the new name to Reddit.');
