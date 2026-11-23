// Création de compte par e-mail et mot de passe.
// Les e-mails de confirmation de Supabase ne partent pas encore vers n'importe quelle adresse
// (pas de service d'envoi branché) : le compte est donc créé déjà confirmé, sauf pour les
// adresses administrateur, qui doivent toujours être prouvées (lien de confirmation, ou Google).
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
}

async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { code: 'method_not_allowed' });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (limited(ip)) return json(429, { code: 'rate_limited' });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!EMAIL.test(email) || email.length > 254) return json(400, { code: 'invalid_email' });
  if (password.length < 8 || password.length > 72) return json(400, { code: 'weak_password' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const { data: isAdmin } = await admin.from('admin_email_hashes').select('hash').eq('hash', await sha256(email)).maybeSingle();
  if (isAdmin) return json(200, { flow: 'confirm' });

  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return json(409, { code: 'already_registered' });
    return json(400, { code: 'signup_failed' });
  }
  return json(200, { flow: 'created' });
});
