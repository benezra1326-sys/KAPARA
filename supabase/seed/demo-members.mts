/**
 * Génère supabase/seed/demo-members.json : les profils de démo pour Supabase, à partir
 * du casting partagé (apps/mobile/src/demo/people.ts) : mêmes identifiants (demo-<clé>),
 * mêmes photos (kapara-demo://, embarquées dans l'app), mêmes réponses et visibilités.
 * Chargement : supabase/seed/load-demo-members.sql (remplace les profils de démo,
 * ne touche jamais aux vrais membres).
 *
 *   npx tsx supabase/seed/demo-members.mts
 */
import { writeFileSync } from 'node:fs';
import { DEMO_PEOPLE, demoUserId, momentUrl, portraitUrl } from '../../apps/mobile/src/demo/people';

const rows = DEMO_PEOPLE.map((p, n) => ({
  id: demoUserId(p.key),
  first_name: p.firstName,
  gender: p.gender,
  seeks: p.seeks,
  birth_date: p.birthDate,
  region_code: p.regionCode,
  headline: p.headline,
  languages: p.languages,
  prompts: p.prompts,
  photos: [
    { id: 'portrait', url: portraitUrl(p.key), isDemo: true },
    ...p.moments.map((m, i) => ({ id: `moment-${i}`, url: momentUrl(p.key, i), caption: m.caption, isDemo: true })),
  ],
  jewish_life: p.jewishLife,
  privacy: p.privacy,
  preferences: p.preferences,
  verified: p.verified,
  // Quelques minutes d'écart pour garder l'ordre du casting.
  created_at: new Date(Date.UTC(2026, 10, 1, 9, 0, 0) - n * 60_000).toISOString(),
}));

writeFileSync(new URL('./demo-members.json', import.meta.url), `${JSON.stringify(rows)}\n`);
console.log(`${rows.length} profils de démo écrits dans supabase/seed/demo-members.json`);
