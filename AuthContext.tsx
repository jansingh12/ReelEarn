import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './lib';

export type Profile = { id: string; username: string; name: string | null; photo_url: string | null };
export type Draft = { method: 'email' | 'phone'; contact: string; fullName: string };

type Ctx = {
  session: Session | null; user: User | null; profile: Profile | null; loading: boolean;
  recovery: boolean; endRecovery: () => void;
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
  const [draft, setD] = useState<Draft>({ method: 'email', contact: '', fullName: '' });

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('id,username,name,photo_url').eq('id', uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session); await loadProfile(data.session?.user.id); if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(s);
      // never call supabase from inside this callback directly: defer to avoid a deadlock
      setTimeout(() => { loadProfile(s?.user.id); }, 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  // Password-reset links open the app at reelearn://reset?code=...
  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url) return;
      const { path, queryParams } = Linking.parse(url);
      if (!path?.startsWith('reset')) return;
      const code = queryParams?.code;
      if (typeof code === 'string') {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) setRecovery(true);
      }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  const value = useMemo<Ctx>(() => ({
    session, user: session?.user ?? null, profile, loading, recovery,
    endRecovery: () => setRecovery(false),
    draft, setDraft: (d) => setD((p) => ({ ...p, ...d })),
    refreshProfile: () => loadProfile(session?.user.id),
    signOut: async () => { await supabase.auth.signOut(); setProfile(null); },
  }), [session, profile, loading, recovery, draft, loadProfile]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
