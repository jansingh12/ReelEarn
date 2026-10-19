import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { makeRedirect } from './redirect';

/** fetch with a 20 s timeout and up to 3 tries when the request never reached the server (no signal, DNS, dropped connection). */
const netFetch: typeof fetch = async (input, init) => {
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const res = await fetch(input, { ...init, signal: init?.signal ?? ctl.signal });
      clearTimeout(timer);
      return res; // any HTTP answer (even 4xx/5xx) is returned as is: the server was reached
    } catch (e) {
      clearTimeout(timer);
      last = e;
      if (init?.signal?.aborted) throw e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw last;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
  global: { fetch: netFetch },
});
export { SUPABASE_URL, SUPABASE_ANON_KEY };
export const redirectTo = (path: string) => makeRedirect(path);

/** Quick reachability test used by the banner on the auth screens. */
export async function checkConnection(): Promise<boolean> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_ANON_KEY }, signal: ctl.signal });
    return res.status < 500;
  } catch { return false; } finally { clearTimeout(timer); }
}

export const USERNAME_RE = /^[a-z0-9._]{3,24}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+[1-9]\d{7,14}$/;
export const NAME_RE = /^[\p{L}][\p{L} .'-]{0,39}$/u;

/** Typed or pasted phone number -> E.164. A bare 10-digit Indian mobile number gets +91. Returns null if it isn't a phone number. */
export function normalizePhone(input: string): string | null {
  const t = input.replace(/[\s()-]/g, '');
  if (/^[6-9]\d{9}$/.test(t)) return '+91' + t;
  return PHONE_RE.test(t) ? t : null;
}
export function ageOn(d: Date, now = new Date()): number {
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const AGE_MSG = 'You must be at least 18 years old to join ReelEarn.';

/** Turns Supabase errors into short sentences a person can act on. */
export function friendly(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e ?? '');
  if (/network request failed|failed to fetch|networkerror|aborted|timeout|timed out|load failed/i.test(m)) return 'Cannot reach ReelEarn right now. Check your internet connection and try again.';
  if (/invalid login|invalid_credentials/i.test(m)) return 'The username, email, number or password is incorrect.';
  if (/signups not allowed|user not found/i.test(m)) return 'No account was found for that email or number.';
  if (/token has expired|invalid.*(otp|token)|otp_expired/i.test(m)) return 'That code is wrong or has expired. Request a new one.';
  if (/rate limit|too many|over_.*_rate_limit|after \d+ seconds|security purposes/i.test(m)) return 'Too many attempts. Please wait a minute and try again.';
  if (/unsupported phone provider|sms|phone.*(disabled|not enabled)|twilio|vonage/i.test(m)) return 'Text-message sign-in is not set up yet. Try email instead.';
  if (/password.*(at least|short|weak)/i.test(m)) return 'Choose a stronger password (at least 6 characters).';
  if (/provider is not enabled|unsupported provider/i.test(m)) return 'This sign-in option is not enabled yet in Supabase.';
  if (/duplicate|already registered|unique/i.test(m)) return 'That one is already taken.';
  if (/invalid api key|apikey/i.test(m)) return 'The app could not authenticate with the server (invalid API key).';
  return m || 'Something went wrong. Please try again.';
}
