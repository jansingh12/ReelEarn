import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CountryPicker } from '../CountryPicker';
import { COUNTRIES, Country, validNational } from '../countries';
import { EMAIL_RE, friendly, redirectTo, supabase } from '../lib';
import { C } from '../theme';
import { Btn, ErrorText, Field, Link, Screen, Sub, Title } from '../ui';

type P = NativeStackScreenProps<any, 'ForgotPassword'>;
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* Step 3: Forgot password. Email: reset link or code. Phone: code. */
export default function ForgotPassword({ navigation, route }: P) {
  const pre = String(route.params?.prefill ?? '');
  const [mode, setMode] = useState<'email' | 'phone'>(/^[+\d]/.test(pre) ? 'phone' : 'email');
  const [email, setEmail] = useState(EMAIL_RE.test(pre) ? pre : '');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [num, setNum] = useState(/^\d{10}$/.test(pre) ? pre : '');
  const [busy, setBusy] = useState<'link' | 'code' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [wait, setWait] = useState(0);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const phone = country.dial + num;
  async function sendLink() {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return setErr('Enter the email address you signed up with.');
    setBusy('link'); setErr(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo: redirectTo('reset') });
      if (error) throw error;
      setSent(true); setWait(60);
    } catch (x) { setErr(friendly(x)); } finally { setBusy(null); }
  }
  async function sendCode() {
    const contact = mode === 'email' ? email.trim().toLowerCase() : phone;
    if (mode === 'email' ? !EMAIL_RE.test(contact) : !validNational(country, num)) return setErr(mode === 'email' ? 'Enter the email address you signed up with.' : `Enter a valid ${country.min === country.max ? country.min + '-digit ' : ''}mobile number.`);
    setBusy('code'); setErr(null);
    try {
      // shouldCreateUser:false -> this can only log in an EXISTING account, never create one
      const { error } = await supabase.auth.signInWithOtp(mode === 'email' ? { email: contact, options: { shouldCreateUser: false } } : { phone: contact, options: { shouldCreateUser: false } });
      if (error) throw error;
      navigation.navigate('VerifyCode', { purpose: 'reset', method: mode, contact });
    } catch (x) { setErr(friendly(x)); } finally { setBusy(null); }
  }

  if (sent) {
    return (
      <Screen onBack={() => navigation.goBack()}>
        <Title>Check your email</Title>
        <Sub>If an account exists for {email.trim()}, a reset link is on its way. Open it on this phone to choose a new password.</Sub>
        <Btn title={wait ? `Send again in ${mmss(wait)}` : 'Send the link again'} variant="outline" disabled={wait > 0} loading={busy === 'link'} onPress={sendLink} />
        <ErrorText>{err}</ErrorText>
        <Btn title="Use a code instead" variant="ghost" onPress={() => { setSent(false); sendCode(); }} />
        <Btn title="Back to login" onPress={() => navigation.navigate('Login')} />
      </Screen>
    );
  }
  return (
    <Screen onBack={() => navigation.goBack()}>
      <Title>Forgot password?</Title>
      <Sub>{mode === 'email' ? "Enter your email and we'll send you a link or a code to get back into your account." : "Enter your mobile number and we'll text you a code to get back into your account."}</Sub>
      {mode === 'email'
        ? <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" />
        : <View style={{ flexDirection: 'row', marginBottom: 14 }}>
            <CountryPicker value={country} onChange={setCountry} />
            <View style={{ flex: 1 }}><Field label="Mobile number" value={num} onChangeText={(t) => setNum(t.replace(/\D/g, '').slice(0, country.max))} keyboardType="number-pad" textContentType="telephoneNumber" /></View>
          </View>}
      <ErrorText>{err}</ErrorText>
      {mode === 'email' ? <><Btn title="Send reset link" onPress={sendLink} loading={busy === 'link'} disabled={!!busy} /><Btn title="Send a code instead" variant="outline" onPress={sendCode} loading={busy === 'code'} disabled={!!busy} /></>
        : <Btn title="Send code" onPress={sendCode} loading={busy === 'code'} />}
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <Link title={mode === 'email' ? 'Use my mobile number instead' : 'Use my email instead'} onPress={() => { setMode(mode === 'email' ? 'phone' : 'email'); setErr(null); }} />
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ alignItems: 'center' }}><Text style={{ color: C.mute, marginBottom: 8 }}>Remembered it?</Text><Link title="Back to login" onPress={() => navigation.navigate('Login')} /></View>
    </Screen>
  );
}
