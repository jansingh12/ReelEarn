import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EMAIL_RE, PHONE_RE, friendly, redirectTo, supabase } from '../lib';
import { C } from '../theme';
import { Btn, Divider, ErrorText, Field, Link, Screen, Sheet, Sub } from '../ui';

WebBrowser.maybeCompleteAuthSession();
type P = NativeStackScreenProps<any, 'Login'>;

export default function Login({ navigation }: P) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const [social, setSocial] = useState(false);

  async function login() {
    const ident = id.trim();
    if (!ident || !pw) return setErr('Enter your username, email or phone number and your password.');
    setBusy(true); setErr(null);
    try {
      if (EMAIL_RE.test(ident)) {
        const { error } = await supabase.auth.signInWithPassword({ email: ident.toLowerCase(), password: pw });
        if (error) throw error;
      } else if (PHONE_RE.test(ident.replace(/\s/g, ''))) {
        const { error } = await supabase.auth.signInWithPassword({ phone: ident.replace(/\s/g, ''), password: pw });
        if (error) throw error;
      } else {
        // Username login runs on the server (Edge Function) so email addresses are never exposed to the app.
        const { data, error } = await supabase.functions.invoke('login-with-username', { body: { username: ident.toLowerCase().replace(/^@/, ''), password: pw } });
        if (error || !data?.session) throw new Error('invalid login');
        const { error: e2 } = await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
        if (e2) throw e2;
      }
      // success: AuthContext sees the session and the navigator switches screens
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 36 }}>
        <Text style={s.brand}>ReelEarn</Text>
      </View>
      <Field label="Username, email or mobile number" value={id} onChangeText={setId} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" />
      <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry={!show} autoCapitalize="none" textContentType="password"
        right={<Pressable onPress={() => setShow(!show)} accessibilityLabel={show ? 'Hide password' : 'Show password'} hitSlop={10}><Text style={{ color: C.mute, fontWeight: '600' }}>{show ? 'Hide' : 'Show'}</Text></Pressable>} />
      <ErrorText>{err}</ErrorText>
      <View style={{ alignItems: 'flex-end', marginBottom: 14 }}><Link title="Forgot password?" onPress={() => setForgot(true)} /></View>
      <Btn title="Log in" onPress={login} loading={busy} />
      <Divider />
      <Btn title="Log in with Facebook or Google" variant="outline" onPress={() => setSocial(true)} />
      <View style={{ flex: 1 }} />
      <Btn title="Create new account" variant="outline" onPress={() => navigation.navigate('SignUpLanding')} style={{ borderColor: C.blue, marginTop: 40 }} />
      {forgot ? <ForgotSheet initial={EMAIL_RE.test(id.trim()) ? id.trim() : ''} onClose={() => setForgot(false)} /> : null}
      {social ? <SocialSheet onClose={() => setSocial(false)} /> : null}
    </Screen>
  );
}

function ForgotSheet({ initial, onClose }: { initial: string; onClose: () => void }) {
  const [email, setEmail] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function send() {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return setErr('Enter the email address you signed up with.');
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo: redirectTo('reset') });
      if (error) throw error;
      setSent(true); setWait(60);
      timer.current = setInterval(() => setWait((w) => { if (w <= 1 && timer.current) clearInterval(timer.current); return Math.max(0, w - 1); }), 1000);
    } catch (x) { setErr(friendly(x)); } finally { setBusy(false); }
  }
  return (
    <Sheet onClose={onClose}>
      <Text style={s.sheetTitle}>Reset your password</Text>
      {sent ? (
        <>
          <Sub>If an account exists for {email.trim()}, a reset link is on its way. Open it on this phone to choose a new password.</Sub>
          <Btn title={wait ? `Send again in ${wait}s` : 'Send again'} variant="outline" disabled={wait > 0} loading={busy} onPress={send} />
          <Btn title="Done" onPress={onClose} />
        </>
      ) : (
        <>
          <Sub>Enter your email and we'll send you a link to get back into your account.</Sub>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
          <ErrorText>{err}</ErrorText>
          <Btn title="Send reset link" onPress={send} loading={busy} />
          <Btn title="Cancel" variant="ghost" onPress={onClose} />
        </>
      )}
    </Sheet>
  );
}

function SocialSheet({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function go(provider: 'facebook' | 'google') {
    setBusy(provider); setErr(null);
    try {
      const back = redirectTo('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: back, skipBrowserRedirect: true } });
      if (error || !data?.url) throw error ?? new Error('unsupported provider');
      const res = await WebBrowser.openAuthSessionAsync(data.url, back);
      if (res.type !== 'success') { setBusy(null); return; } // the person closed the browser: not an error
      const code = Linking.parse(res.url).queryParams?.code;
      if (typeof code !== 'string') throw new Error('Sign-in was cancelled or did not finish. Please try again.');
      const { error: e2 } = await supabase.auth.exchangeCodeForSession(code);
      if (e2) throw e2;
      onClose();
    } catch (e) { setErr(friendly(e)); } finally { setBusy(null); }
  }
  return (
    <Sheet onClose={onClose}>
      <Text style={s.sheetTitle}>Continue with</Text>
      <Btn title="Continue with Facebook" onPress={() => go('facebook')} loading={busy === 'facebook'} disabled={!!busy} />
      <Btn title="Continue with Google" variant="outline" onPress={() => go('google')} loading={busy === 'google'} disabled={!!busy} />
      <ErrorText>{err}</ErrorText>
      <Btn title="Cancel" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}
const s = StyleSheet.create({
  brand: { color: C.text, fontSize: 40, fontWeight: '800', letterSpacing: 0.5 },
  sheetTitle: { color: C.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
});
