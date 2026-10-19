import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';
import { checkConnection, supabase } from './lib';

export type Profile = { id: string; username: string; name: string | null; photo_url: string | null };
export type Draft = { method: 'email' | 'phone'; contact: string; first: string; last: string; dob: string };
export type Online = 'checking' | 'ok' | 'offline';

type Ctx = {
  session: Session | null; user: User | null; profile: Profile | null; loading: boolean;
  recovery: boolean; beginRecovery: () => void; endRecovery: () => void;
  blocked: boolean; blockUnderage: () => Promise<void>; clearBlocked: () => void;
  online: Online; recheck: () => Promise<void>;
  draft: Draft; setDraft: (d: Partial<Draft>) => void;
  refreshProfile: () => Promise<void>; signOut: () => Promise<void>;
};
const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [online, setOnline] = useState<Online>('checking');
  const [draft, setD] = useState<Draft>({ method: 'phone', contact: '', first: '', last: '', dob: '' });

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('id,username,name,photo_url').eq('id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  const recheck = useCallback(async () => { setOnline('checking'); setOnline((await checkConnection()) ? 'ok' : 'offline'); }, []);

  useEffect(() => {
    let alive = true;
    recheck();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session); await loadProfile(data.session?.user.id); if (alive) setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(s);
      setTimeout(() => { loadProfile(s?.user.id); }, 0); // deferred: never call supabase inside this callback directly
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile, recheck]);

  // Password-reset links open the app at reelearn://reset?code=...
  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url) return;
      const { path, queryParams } = Linking.parse(url);
      if (!path?.startsWith('reset')) return;
      const code = queryParams?.code;
      if (typeof code === 'string') {
        setRecovery(true);
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) setRecovery(false);
      }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  const value = useMemo<Ctx>(() => ({
    session, user: session?.user ?? null, profile, loading,
    recovery, beginRecovery: () => setRecovery(true), endRecovery: () => setRecovery(false),
    blocked, clearBlocked: () => setBlocked(false),
    blockUnderage: async () => {
      setBlocked(true); // show the "18+" screen right away
      await supabase.auth.updateUser({ data: { underage: true } }).catch(() => undefined);
      await supabase.functions.invoke('reject-underage').catch(() => undefined); // removes the half-created account
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      setProfile(null);
    },
    online, recheck,
    draft, setDraft: (d) => setD((p) => ({ ...p, ...d })),
    refreshProfile: () => loadProfile(session?.user.id),
    signOut: async () => { await supabase.auth.signOut(); setProfile(null); },
  }), [session, profile, loading, recovery, blocked, online, recheck, draft, loadProfile]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
