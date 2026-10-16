import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { makeRedirect } from './redirect';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string; // public anon key: Row Level Security protects the data

export const supabase = createClient(url, anon, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
});
export const SUPABASE_URL = url;
export const SUPABASE_ANON = anon;
export const redirectTo = (path: string) => makeRedirect(path);

export const USERNAME_RE = /^[a-z0-9._]{3,24}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+[1-9]\d{7,14}$/;

/** Turns Supabase errors into short sentences a person can act on. */
export function friendly(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e ?? '');
  if (/network|fetch/i.test(m)) return 'Cannot reach the server. Check your connection and try again.';
  if (/invalid login|invalid_credentials/i.test(m)) return 'The username/email or password is incorrect.';
  if (/token has expired|invalid.*(otp|token)|otp_expired/i.test(m)) return 'That code is wrong or has expired. Request a new one.';
  if (/rate limit|too many|over_.*_rate_limit|after \d+ seconds/i.test(m)) return 'Too many attempts. Please wait a minute and try again.';
  if (/unsupported phone provider|sms/i.test(m)) return 'Text-message sign-in is not set up yet. Try email instead.';
  if (/password.*(at least|short|weak)/i.test(m)) return 'Choose a stronger password (at least 6 characters).';
  if (/provider is not enabled|unsupported provider/i.test(m)) return 'This sign-in option is not enabled yet in Supabase.';
  if (/duplicate|already registered|unique/i.test(m)) return 'That one is already taken.';
  return m || 'Something went wrong. Please try again.';
}
