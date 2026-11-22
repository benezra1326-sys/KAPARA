/**
 * i18n completeness check: every key of fr.ts (the reference) must exist in
 * en.ts and he.ts with the same {{variables}}; plural keys must have every
 * plural form the language needs. Run: npm run i18n:check -w @kapara/mobile
 */
import fr from './fr.ts';
import en from './en.ts';
import he from './he.ts';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Tree = { [k: string]: string | Tree };
const flat = (t: Tree, p = ''): Record<string, string> =>
  Object.entries(t).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = p ? `${p}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flat(v, key) };
  }, {});
const vars = (s: string) => new Set([...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]));
const PLURAL = /_(zero|one|two|few|many|other)$/;
const FORMS: Record<string, string[]> = { en: ['one', 'other'], he: ['one', 'two', 'other'] };

const ref = flat(fr as Tree);
let problems = 0;
for (const [lang, cat] of [['en', en], ['he', he]] as const) {
  const target = flat(cat as Tree);
  const bases = new Set<string>();
  for (const [key, value] of Object.entries(ref)) {
    if (PLURAL.test(key)) { bases.add(key.replace(PLURAL, '')); continue; }
    if (!(key in target)) { console.error(`[${lang}] missing: ${key}`); problems++; continue; }
    for (const v of vars(value)) if (!vars(target[key]!).has(v)) { console.error(`[${lang}] ${key}: missing {{${v}}}`); problems++; }
  }
  for (const base of bases) {
    const refVars = vars(ref[`${base}_other`] ?? '');
    for (const form of FORMS[lang]!) {
      const k = `${base}_${form}`;
      if (!(k in target)) { console.error(`[${lang}] missing plural: ${k}`); problems++; continue; }
      // "one"/"two" may spell the number out; other forms must keep every variable.
      if (form === 'other') for (const v of refVars) if (!vars(target[k]!).has(v)) { console.error(`[${lang}] ${k}: missing {{${v}}}`); problems++; }
    }
  }
  for (const key of Object.keys(target)) {
    const known = PLURAL.test(key) ? bases.has(key.replace(PLURAL, '')) : key in ref;
    if (!known) { console.error(`[${lang}] unknown key (not in fr): ${key}`); problems++; }
  }
}
// Every literal t('…') key used in the app must exist in fr.ts.
const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : [];
});
const bases = new Set(Object.keys(ref).map((k) => k.replace(PLURAL, '')));
const prefixes = new Set(Object.keys(ref).flatMap((k) => k.split('.').slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join('.'))));
for (const file of [...walk(join(mobile, 'app')), ...walk(join(mobile, 'src'))]) {
  for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*(['"`])([\w.-]+)\1/g)) {
    const k = m[2]!;
    if (!bases.has(k) && !prefixes.has(k)) { console.error(`[usage] ${file.slice(mobile.length + 1)}: t('${k}') not in fr.ts`); problems++; }
  }
}

if (problems) { console.error(`\n${problems} i18n problem(s).`); process.exit(1); }
console.log(`i18n OK: ${Object.keys(ref).length} keys in fr, complete in en and he.`);
