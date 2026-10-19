import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../AuthContext';
import { EMAIL_RE, friendly, normalizePhone, redirectTo, supabase } from '../lib';
import { C } from '../theme';
import { Banner, Btn, Divider, ErrorText, Field, Link, Screen, Sheet, Sub } from '../ui';

WebBrowser.maybeCompleteAuthSession();
type P = NativeStackScreenProps<any, 'Login'>;
type Provider = 'facebook' | 'google';

/* Step 2: Login (phone / email / username + password) */
export default function Login({ navigation }: P) {
  const { online, recheck } = useAuth();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [social, setSocial] = useState<Provider | null>(null);

  async function login() {
    const ident = id.trim();
    if (!ident || !pw) return setErr('Enter your phone number, email or username and your password.');
    setBusy(true); setErr(null);
    try {
      const phone = normalizePhone(ident);
      if (EMAIL_RE.test(ident)) {
        const { error } = await supabase.auth.signInWithPassword({ email: ident.toLowerCase(), password: pw });
        if (error) throw error;
      } else if (phone) {
        const { error } = await supabase.auth.signInWithPassword({ phone, password: pw });
        if (error) throw error;
      } else {
        // Username login runs on the server (Edge Function) so email addresses and numbers are never exposed to the app.
        const { data, error } = await supabase.functions.invoke('login-with-username', { body: { username: ident.toLowerCase().replace(/^@/, ''), password: pw } });
        if (error || !data?.session) throw new Error(error && /fetch|network/i.test(String(error.message)) ? 'network request failed' : 'invalid login');
        const { error: e2 } = await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
        if (e2) throw e2;
      }
      // success: AuthContext sees the session and the navigator switches screens
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: 36, marginBottom: 32 }}><Text style={s.brand}>ReelEarn</Text></View>
      {online === 'offline' ? <Banner text="Can't reach the ReelEarn server. Check your internet connection." action="Retry" onAction={recheck} /> : null}
      <Field label="Phone number, email or username" value={id} onChangeText={setId} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" />
      <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry={!show} autoCapitalize="none" textContentType="password"
        right={<Pressable onPress={() => setShow(!show)} accessibilityLabel={show ? 'Hide password' : 'Show password'} hitSlop={10}><Text style={{ color: C.mute, fontWeight: '600' }}>{show ? 'Hide' : 'Show'}</Text></Pressable>} />
      <ErrorText>{err}</ErrorText>
      <View style={{ alignItems: 'flex-end', marginBottom: 14 }}><Link title="Forgot password?" onPress={() => navigation.navigate('ForgotPassword', { prefill: id.trim() })} /></View>
      <Btn title="Log in" onPress={login} loading={busy} />
      <Divider />
      <Btn title="Log in with Facebook" variant="outline" onPress={() => setSocial('facebook')} />
      <Btn title="Log in with Google" variant="outline" onPress={() => setSocial('google')} />
      <View style={{ flex: 1 }} />
      <View style={{ alignItems: 'center', marginTop: 32, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <Text style={{ color: C.mute }}>Don't have an account?</Text><Link title="Sign up" onPress={() => navigation.navigate('SignUpLanding')} />
      </View>
      {social ? <SocialSheet provider={social} onClose={() => setSocial(null)} /> : null}
    </Screen>
  );
}

/* Step 4: Social login popup (Facebook or Google) */
function SocialSheet({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const name = provider === 'facebook' ? 'Facebook' : 'Google';
  async function go() {
    setBusy(true); setErr(null);
    try {
      const back = redirectTo('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: back, skipBrowserRedirect: true } });
      if (error || !data?.url) throw error ?? new Error('unsupported provider');
      const res = await WebBrowser.openAuthSessionAsync(data.url, back);
      if (res.type !== 'success') { setBusy(false); return; } // browser closed by the person: not an error
      const code = Linking.parse(res.url).queryParams?.code;
      if (typeof code !== 'string') throw new Error('Sign-in was cancelled or did not finish. Please try again.');
      const { error: e2 } = await supabase.auth.exchangeCodeForSession(code);
      if (e2) throw e2;
      onClose();
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Sheet onClose={onClose}>
      <Text style={s.sheetTitle}>Log in with {name}</Text>
      <Sub>You can log in to ReelEarn with your {name} account. We only receive your name and email.</Sub>
      <ErrorText>{err}</ErrorText>
      <Btn title={`Continue with ${name}`} onPress={go} loading={busy} />
      <Btn title="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
    </Sheet>
  );
}
const s = StyleSheet.create({
  brand: { color: C.text, fontSize: 40, fontWeight: '800', letterSpacing: 0.5 },
  sheetTitle: { color: C.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
});
