// Edge Function: log in with a username + password without ever sending the account's email/phone to the app.
// Deploy:  supabase functions deploy login-with-username --no-verify-jwt
// (Supabase injects SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY automatically.)
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const FAIL = () => json({ error: 'invalid login' }, 401); // same answer for "no such user" and "wrong password"

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let username = '', password = '';
  try { ({ username, password } = await req.json()); } catch { return FAIL(); }
  username = String(username ?? '').toLowerCase().trim();
  if (!/^[a-z0-9._]{3,24}$/.test(username) || typeof password !== 'string' || !password || password.length > 200) return FAIL();

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: prof } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
  if (!prof) return FAIL();
  const { data: u } = await admin.auth.admin.getUserById(prof.id);
  const email = u?.user?.email, phone = u?.user?.phone;
  if (!email && !phone) return FAIL();

  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword(email ? { email, password } : { phone: phone!, password });
  if (error || !data.session) return FAIL();
  return json({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
});
