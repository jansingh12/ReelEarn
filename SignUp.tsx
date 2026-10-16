import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../AuthContext';
import { EMAIL_RE, PHONE_RE, USERNAME_RE, friendly, supabase } from '../lib';
import { C } from '../theme';
import { Btn, ErrorText, Field, Link, Screen, Sub, Title } from '../ui';

type P = NativeStackScreenProps<any>;

/* 5. Create New Account landing */
export function SignUpLanding({ navigation }: P) {
  return (
    <Screen onBack={() => navigation.goBack()}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={s.big}>Join ReelEarn</Text>
        <Sub style={{ textAlign: 'center', marginTop: 8 }}>Watch reels, share stories and earn coins. It only takes a minute.</Sub>
        <Btn title="Create new account" onPress={() => navigation.navigate('ChooseMethod')} style={{ marginTop: 24 }} />
        <View style={{ alignItems: 'center', marginTop: 22 }}><Link title="I already have an account" onPress={() => navigation.navigate('Login')} /></View>
      </View>
    </Screen>
  );
}

/* 6. Choose sign-up method */
export function ChooseMethod({ navigation }: P) {
  const { setDraft } = useAuth();
  const pick = (method: 'email' | 'phone') => { setDraft({ method, contact: '' }); navigation.navigate('EnterContact'); };
  return (
    <Screen onBack={() => navigation.goBack()}>
      <Title>How do you want to sign up?</Title>
      <Sub>We'll send a 6-digit code to confirm it's you.</Sub>
      <Btn title="Sign up with mobile number" onPress={() => pick('phone')} />
      <Btn title="Sign up with email" variant="outline" onPress={() => pick('email')} />
    </Screen>
  );
}

/* 7. Enter mobile number / email */
export function EnterContact({ navigation }: P) {
  const { draft, setDraft } = useAuth();
  const isPhone = draft.method === 'phone';
  const [val, setVal] = useState(isPhone ? '+91' : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function next() {
    const contact = isPhone ? val.replace(/[\s()-]/g, '') : val.trim().toLowerCase();
    if (isPhone ? !PHONE_RE.test(contact) : !EMAIL_RE.test(contact)) return setErr(isPhone ? 'Enter your number with the country code, for example +919876543210.' : 'Enter a valid email address.');
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp(isPhone ? { phone: contact, options: { shouldCreateUser: true } } : { email: contact, options: { shouldCreateUser: true } });
      if (error) throw error;
      setDraft({ contact });
      navigation.navigate('VerifyCode');
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Screen onBack={() => navigation.goBack()}>
      <Title>{isPhone ? "What's your mobile number?" : "What's your email address?"}</Title>
      <Sub>{isPhone ? 'Include your country code. We may send a text message with a confirmation code.' : 'Use an email you can access. We will send a confirmation code to it.'}</Sub>
      <Field label={isPhone ? 'Mobile number' : 'Email address'} value={val} onChangeText={setVal} autoCapitalize="none" autoCorrect={false}
        keyboardType={isPhone ? 'phone-pad' : 'email-address'} textContentType={isPhone ? 'telephoneNumber' : 'emailAddress'} />
      <ErrorText>{err}</ErrorText>
      <Btn title="Next" onPress={next} loading={busy} />
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <Link title={isPhone ? 'Sign up with email instead' : 'Sign up with mobile number instead'} onPress={() => { setDraft({ method: isPhone ? 'email' : 'phone' }); setVal(isPhone ? '' : '+91'); setErr(null); }} />
      </View>
    </Screen>
  );
}

/* 8. Verification code (6 digits) */
export function VerifyCode({ navigation }: P) {
  const { draft } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(60);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { const t = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000); return () => clearInterval(t); }, []);

  async function verify(token: string) {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const { error } = draft.method === 'phone'
        ? await supabase.auth.verifyOtp({ phone: draft.contact, token, type: 'sms' })
        : await supabase.auth.verifyOtp({ email: draft.contact, token, type: 'email' });
      if (error) throw error;
      // success: a session now exists, AuthContext switches to the onboarding steps (password, name, username, photo)
    } catch (e) { setErr(friendly(e)); setCode(''); } finally { setBusy(false); }
  }
  async function resend() {
    setErr(null); setNote(null);
    const { error } = await supabase.auth.signInWithOtp(draft.method === 'phone' ? { phone: draft.contact } : { email: draft.contact });
    if (error) return setErr(friendly(error));
    setWait(60); setNote('A new code is on its way.');
  }
  return (
    <Screen onBack={() => navigation.goBack()}>
      <Title>Enter the confirmation code</Title>
      <Sub>We sent a 6-digit code to {draft.contact}.</Sub>
      <Field label="6-digit code" value={code} onChangeText={(t) => { const d = t.replace(/\D/g, '').slice(0, 6); setCode(d); if (d.length === 6) verify(d); }}
        keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} style={{ letterSpacing: 8, fontSize: 22, textAlign: 'center' }} />
      <ErrorText>{err}</ErrorText>
      {note ? <Text style={{ color: C.green, marginBottom: 12 }}>{note}</Text> : null}
      <Btn title="Next" onPress={() => verify(code)} loading={busy} disabled={code.length !== 6} />
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        {wait > 0 ? <Text style={{ color: C.mute }}>Resend code in {wait}s</Text> : <Link title="Resend code" onPress={resend} />}
      </View>
    </Screen>
  );
}

/* 9. Create password (min 6) */
export function CreatePassword({ navigation }: P) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function next() {
    if (pw.length < 6) return setErr('Your password needs at least 6 characters.');
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw, data: { has_password: true } });
      if (error) throw error;
      navigation.navigate('FullName');
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Screen>
      <Title>Create a password</Title>
      <Sub>Use at least 6 characters. You'll use it to log in next time.</Sub>
      <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry={!show} autoCapitalize="none" textContentType="newPassword"
        ok={pw.length >= 6} hint={pw ? (pw.length >= 6 ? 'Looks good' : `${6 - pw.length} more character${6 - pw.length === 1 ? '' : 's'}`) : undefined}
        right={<Pressable onPress={() => setShow(!show)} hitSlop={10} accessibilityLabel={show ? 'Hide password' : 'Show password'}><Text style={{ color: C.mute, fontWeight: '600' }}>{show ? 'Hide' : 'Show'}</Text></Pressable>} />
      <ErrorText>{err}</ErrorText>
      <Btn title="Next" onPress={next} loading={busy} disabled={pw.length < 6} />
    </Screen>
  );
}

/* 10. Basic information: full name */
export function FullName({ navigation }: P) {
  const { draft, setDraft, user } = useAuth();
  const [name, setName] = useState(draft.fullName || String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''));
  const [err, setErr] = useState<string | null>(null);
  function next() {
    const n = name.trim().replace(/\s+/g, ' ');
    if (n.length < 2) return setErr('Enter your name.');
    setDraft({ fullName: n.slice(0, 80) });
    navigation.navigate('Username');
  }
  return (
    <Screen>
      <Title>What's your name?</Title>
      <Sub>Add your name so friends can find you. You can change it later.</Sub>
      <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" maxLength={80} />
      <ErrorText>{err}</ErrorText>
      <Btn title="Next" onPress={next} />
    </Screen>
  );
}

/* 11. Username with real-time availability check */
type Avail = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid' | 'error';
export function Username({ navigation }: P) {
  const { draft, refreshProfile, user } = useAuth();
  const seed = (draft.fullName || String(user?.email ?? '').split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20);
  const [u, setU] = useState(seed.length >= 3 ? seed : '');
  const [st, setSt] = useState<Avail>('idle');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!u) { setSt('idle'); return; }
    if (!USERNAME_RE.test(u)) { setSt('invalid'); return; }
    setSt('checking');
    const my = ++seq.current;
    const t = setTimeout(async () => {
      const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('username', u);
      if (my !== seq.current) return; // a newer keystroke superseded this check
      setSt(error ? 'error' : count === 0 ? 'ok' : 'taken');
    }, 400);
    return () => clearTimeout(t);
  }, [u]);

  const hint = { idle: '3–24 characters: letters, numbers, dots and underscores.', checking: 'Checking…', ok: `@${u} is available`, taken: `@${u} is taken`, invalid: '3–24 characters: letters, numbers, dots and underscores only.', error: 'Could not check right now. You can still try Next.' }[st];
  const suggestions = st === 'taken' ? [1, 2, 3].map(() => `${u.slice(0, 20)}${Math.floor(10 + Math.random() * 90)}`) : [];

  async function next() {
    if (!user || !USERNAME_RE.test(u)) return;
    setBusy(true); setErr(null);
    try {
      // remember that the photo step is still pending, so closing the app here resumes at the photo screen
      const { error: e1 } = await supabase.auth.updateUser({ data: { onboarding: 'photo' } });
      if (e1) throw e1;
      const { error } = await supabase.from('profiles').upsert({ id: user.id, username: u, name: draft.fullName || null, updated_at: new Date().toISOString() });
      if (error) { if (error.code === '23505') { setSt('taken'); setErr('That username was just taken. Try another.'); return; } throw error; }
      await refreshProfile();
      navigation.navigate('ProfilePhoto');
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Screen>
      <Title>Choose a username</Title>
      <Sub>Pick a unique username. You can change it later.</Sub>
      <Field label="Username" value={u} onChangeText={(t) => setU(t.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 24))} autoCapitalize="none" autoCorrect={false}
        ok={st === 'ok'} bad={st === 'taken' || st === 'invalid'} hint={hint} />
      {suggestions.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>{suggestions.map((x) => (
        <Pressable key={x} onPress={() => setU(x)} style={s.chip}><Text style={{ color: C.text }}>{x}</Text></Pressable>))}</View> : null}
      <ErrorText>{err}</ErrorText>
      <Btn title="Next" onPress={next} loading={busy} disabled={st === 'invalid' || st === 'taken' || st === 'checking' || !u} />
    </Screen>
  );
}

/* 12. Profile photo (pick or skip) */
export function ProfilePhoto() {
  const { user, profile, refreshProfile } = useAuth();
  const [img, setImg] = useState<{ uri: string; base64: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick() {
    setErr(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setErr('Photo access is off. Allow it in your phone settings, or tap Skip.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    if (!r.canceled && r.assets[0]?.base64) setImg({ uri: r.assets[0].uri, base64: r.assets[0].base64 });
  }
  async function finish(withPhoto: boolean) {
    if (!user) return;
    setBusy(true); setErr(null);
    try {
      if (withPhoto && img) {
        const path = `${user.id}/avatar.jpg`; // policy: you can only write inside your own <user-id>/ folder
        const { error } = await supabase.storage.from('avatars').upload(path, decode(img.base64), { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
        const url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
        const { error: e2 } = await supabase.from('profiles').update({ photo_url: url, updated_at: new Date().toISOString() }).eq('id', user.id);
        if (e2) throw e2;
      }
      await refreshProfile();
      const { error: e3 } = await supabase.auth.updateUser({ data: { onboarding: null } }); // onboarding finished: the app opens
      if (e3) throw e3;
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Screen>
      <Title>Add a profile photo</Title>
      <Sub>Add a photo so your friends know it's you. You can skip this and add one later.</Sub>
      <View style={{ alignItems: 'center', marginVertical: 18 }}>
        <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel="Choose a photo">
          {img ? <Image source={{ uri: img.uri }} style={s.avatar} /> : <View style={[s.avatar, s.avatarEmpty]}><Text style={{ color: C.text, fontSize: 56, fontWeight: '700' }}>{(profile?.username ?? '?').slice(0, 1).toUpperCase()}</Text></View>}
        </Pressable>
      </View>
      <ErrorText>{err}</ErrorText>
      <Btn title={img ? 'Use this photo' : 'Add a photo'} onPress={img ? () => finish(true) : pick} loading={busy} />
      {img ? <Btn title="Choose a different photo" variant="outline" onPress={pick} disabled={busy} /> : null}
      <View style={{ alignItems: 'center', marginTop: 20 }}><Link title="Skip" onPress={() => !busy && finish(false)} /></View>
    </Screen>
  );
}

/* Password reset (after the email link opens the app) */
export function ResetPassword() {
  const { endRecovery } = useAuth();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    if (pw.length < 6) return setErr('Your password needs at least 6 characters.');
    setBusy(true); setErr(null);
    try { const { error } = await supabase.auth.updateUser({ password: pw }); if (error) throw error; endRecovery(); }
    catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Screen>
      <Title>Choose a new password</Title>
      <Sub>Use at least 6 characters.</Sub>
      <Field label="New password" value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
      <ErrorText>{err}</ErrorText>
      <Btn title="Save password" onPress={save} loading={busy} disabled={pw.length < 6} />
    </Screen>
  );
}
const s = StyleSheet.create({
  big: { color: C.text, fontSize: 34, fontWeight: '800', textAlign: 'center' },
  chip: { backgroundColor: C.field2, borderColor: C.border, borderWidth: 1, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14 },
  avatar: { width: 160, height: 160, borderRadius: 80 },
  avatarEmpty: { backgroundColor: C.field2, borderColor: C.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
