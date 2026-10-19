import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { decode } from 'base64-arraybuffer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../AuthContext';
import { CountryPicker } from '../CountryPicker';
import { COUNTRIES, Country, validNational } from '../countries';
import { AGE_MSG, EMAIL_RE, NAME_RE, USERNAME_RE, ageOn, friendly, iso, supabase } from '../lib';
import { C } from '../theme';
import { Banner, Btn, ErrorText, Field, Link, OtpBoxes, Screen, Sub, Title } from '../ui';

type P = NativeStackScreenProps<any>;
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/* Step 5: Create account (welcome) */
export function SignUpLanding({ navigation }: P) {
  return (
    <Screen onBack={() => navigation.goBack()}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={s.big}>ReelEarn</Text>
        <Sub style={{ textAlign: 'center', marginTop: 10 }}>Sign up to share reels and stories and grow your audience. It only takes a minute.</Sub>
        <Btn title="Create new account" onPress={() => navigation.navigate('ChooseMethod')} style={{ marginTop: 24 }} />
        <View style={{ alignItems: 'center', marginTop: 22 }}><Link title="Log in" onPress={() => navigation.navigate('Login')} /></View>
      </View>
    </Screen>
  );
}

/* Step 6: Choose sign-up method */
export function ChooseMethod({ navigation }: P) {
  const { setDraft } = useAuth();
  const pick = (method: 'email' | 'phone') => { setDraft({ method, contact: '' }); navigation.navigate('EnterContact'); };
  return (
    <Screen onBack={() => navigation.goBack()}>
      <Title>Create account</Title>
      <Sub>Choose how you want to sign up. We'll send a 6-digit code to confirm it's you.</Sub>
      <Btn title="Sign up with mobile number" onPress={() => pick('phone')} />
      <Btn title="Sign up with email" variant="outline" onPress={() => pick('email')} />
      <View style={{ alignItems: 'center', marginTop: 22 }}><Link title="I already have an account" onPress={() => navigation.navigate('Login')} /></View>
    </Screen>
  );
}

/* Step 7: Enter mobile number (country code, default +91) or email */
export function EnterContact({ navigation }: P) {
  const { draft, setDraft, online, recheck } = useAuth();
  const isPhone = draft.method === 'phone';
  const [country, setCountry] = useState<Country>(COUNTRIES[0]); // India +91
  const [num, setNum] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function next() {
    const contact = isPhone ? country.dial + num : email.trim().toLowerCase();
    if (isPhone ? !validNational(country, num) : !EMAIL_RE.test(contact)) {
      return setErr(isPhone ? (country.dial === '+91' ? 'Enter a valid 10-digit mobile number.' : 'Enter a valid mobile number.') : 'Enter a valid email address.');
    }
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp(isPhone ? { phone: contact, options: { shouldCreateUser: true } } : { email: contact, options: { shouldCreateUser: true } });
      if (error) throw error;
      setDraft({ contact });
      navigation.navigate('VerifyCode', { purpose: 'signup' });
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Screen onBack={() => navigation.goBack()}>
      <Title>{isPhone ? "What's your mobile number?" : "What's your email address?"}</Title>
      <Sub>{isPhone ? "Enter the mobile number you'll use for your account. We'll send a verification code." : 'Use an email you can access. We will send a confirmation code to it.'}</Sub>
      {online === 'offline' ? <Banner text="Can't reach the ReelEarn server. Check your internet connection." action="Retry" onAction={recheck} /> : null}
      {isPhone
        ? <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            <CountryPicker value={country} onChange={(c) => { setCountry(c); setNum(num.slice(0, c.max)); }} />
            <View style={{ flex: 1 }}><Field label="Mobile number" value={num} onChangeText={(t) => setNum(t.replace(/\D/g, '').slice(0, country.max))} keyboardType="number-pad" textContentType="telephoneNumber" autoComplete="tel" maxLength={country.max} /></View>
          </View>
        : <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" />}
      {isPhone ? <Text style={s.note}>{country.dial === '+91' ? 'India: 10-digit number, no 0 at the start.' : `Enter the number without ${country.dial}.`}</Text> : null}
      <ErrorText>{err}</ErrorText>
      <Btn title="Next" onPress={next} loading={busy} disabled={isPhone ? !num : !email} />
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <Link title={isPhone ? 'Sign up with email instead' : 'Sign up with mobile number instead'} onPress={() => { setDraft({ method: isPhone ? 'email' : 'phone' }); setErr(null); }} />
      </View>
    </Screen>
  );
}

/* Step 8: 6-digit verification code with resend timer (also used by Forgot password) */
export function VerifyCode({ navigation, route }: P) {
  const { draft, beginRecovery, endRecovery } = useAuth();
  const reset = route.params?.purpose === 'reset';
  const method: 'email' | 'phone' = reset ? route.params?.method : draft.method;
  const contact: string = reset ? route.params?.contact : draft.contact;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(60);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { const t = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000); return () => clearInterval(t); }, []);

  async function verify(token: string) {
    if (busy || token.length !== 6) return;
    setBusy(true); setErr(null);
    if (reset) beginRecovery(); // so the app opens "choose a new password" instead of the home screen
    try {
      const { error } = method === 'phone'
        ? await supabase.auth.verifyOtp({ phone: contact, token, type: 'sms' })
        : await supabase.auth.verifyOtp({ email: contact, token, type: 'email' });
      if (error) throw error;
      // success: a session exists now. Sign-up continues with the password step, reset continues with the new-password screen.
    } catch (e) { if (reset) endRecovery(); setErr(friendly(e)); setCode(''); } finally { setBusy(false); }
  }
  async function resend() {
    setErr(null); setNote(null);
    const opts = reset ? { shouldCreateUser: false } : { shouldCreateUser: true };
    const { error } = await supabase.auth.signInWithOtp(method === 'phone' ? { phone: contact, options: opts } : { email: contact, options: opts });
    if (error) return setErr(friendly(error));
    setWait(60); setNote('A new code is on its way.');
  }
  return (
    <Screen onBack={() => navigation.goBack()}>
      <Title>Enter confirmation code</Title>
      <Sub>We sent a 6-digit code to {contact}.</Sub>
      <OtpBoxes value={code} onChange={(d) => { setCode(d); if (d.length === 6) verify(d); }} autoFocus />
      <ErrorText>{err}</ErrorText>
      {note ? <Text style={{ color: C.green, marginBottom: 12 }}>{note}</Text> : null}
      <Btn title="Next" onPress={() => verify(code)} loading={busy} disabled={code.length !== 6} />
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        {wait > 0 ? <Text style={{ color: C.mute }}>Resend code ({mmss(wait)})</Text> : <Link title="Resend code" onPress={resend} />}
      </View>
    </Screen>
  );
}

/* Step 9: Create password */
export function CreatePassword({ navigation }: P) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const strength = pw.length < 6 ? 'short' : /\d/.test(pw) && /[A-Za-z]/.test(pw) && pw.length >= 8 ? 'strong' : 'ok';
  async function next() {
    if (pw.length < 6) return setErr('Your password needs at least 6 characters.');
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw, data: { has_password: true } });
      if (error) throw error;
      navigation.navigate('BasicInfo');
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Screen>
      <Title>Create a password</Title>
      <Sub>Use at least 6 characters. Mixing letters, numbers and symbols makes it harder to guess.</Sub>
      <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry={!show} autoCapitalize="none" textContentType="newPassword"
        ok={pw.length >= 6} hint={!pw ? undefined : strength === 'short' ? `${6 - pw.length} more character${6 - pw.length === 1 ? '' : 's'}` : strength === 'strong' ? 'Strong password' : 'Good. Add numbers or symbols to make it stronger.'}
        right={<Pressable onPress={() => setShow(!show)} hitSlop={10} accessibilityLabel={show ? 'Hide password' : 'Show password'}><Text style={{ color: C.mute, fontWeight: '600' }}>{show ? 'Hide' : 'Show'}</Text></Pressable>} />
      <ErrorText>{err}</ErrorText>
      <Btn title="Next" onPress={next} loading={busy} disabled={pw.length < 6} />
    </Screen>
  );
}

/* Step 10: Basic information, first name and last name */
export function BasicInfo({ navigation }: P) {
  const { draft, setDraft, user } = useAuth();
  const m = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const fullFromSocial = String(m.full_name ?? m.name ?? '').trim().split(/\s+/);
  const [first, setFirst] = useState(draft.first || m.first_name || fullFromSocial[0] || '');
  const [last, setLast] = useState(draft.last || m.last_name || fullFromSocial.slice(1).join(' ') || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function next() {
    const f = first.trim().replace(/\s+/g, ' '), l = last.trim().replace(/\s+/g, ' ');
    if (!NAME_RE.test(f)) return setErr('Enter your first name using letters only.');
    if (!NAME_RE.test(l)) return setErr('Enter your last name (surname) using letters only.');
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.updateUser({ data: { first_name: f, last_name: l } }); // saved so sign-up can be resumed later
      if (error) throw error;
      setDraft({ first: f, last: l });
      navigation.navigate('BirthDate');
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Screen>
      <Title>What's your name?</Title>
      <Sub>Enter your first name and last name (surname). You can change how your name appears later.</Sub>
      <Field label="First name" value={first} onChangeText={setFirst} autoCapitalize="words" textContentType="givenName" maxLength={40} />
      <Field label="Last name / Surname" value={last} onChangeText={setLast} autoCapitalize="words" textContentType="familyName" maxLength={40} />
      <ErrorText>{err}</ErrorText>
      <Btn title="Next" onPress={next} loading={busy} disabled={!first.trim() || !last.trim()} />
    </Screen>
  );
}

/* Step 11: Date of birth and 18+ check */
export function BirthDate({ navigation }: P) {
  const { setDraft, blockUnderage } = useAuth();
  const today = new Date();
  const [dob, setDob] = useState<Date>(new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()));
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(Platform.OS === 'ios');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const age = ageOn(dob);
  const minor = touched && age < 18;

  function onChange(e: DateTimePickerEvent, d?: Date) {
    if (Platform.OS === 'android') setOpen(false);
    if (e.type === 'set' && d) { setDob(d); setTouched(true); setErr(null); }
  }
  async function next() {
    if (!touched) return;
    if (age < 18) { await blockUnderage(); return; } // account is removed and signed out, the "18+" screen appears
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.updateUser({ data: { dob: iso(dob) } });
      if (error) throw error;
      setDraft({ dob: iso(dob) });
      navigation.navigate('Username');
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Screen>
      <Title>What's your date of birth?</Title>
      <Sub>You must be 18 or older to use ReelEarn. Your date of birth is private and is not shown on your profile.</Sub>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Choose date of birth" style={[s.dobBtn, minor && { borderColor: C.red }]}>
        <Text style={{ color: touched ? C.text : C.mute, fontSize: 16 }}>{touched ? dob.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Select date of birth'}</Text>
        {touched ? <Text style={{ color: minor ? C.red : C.mute }}>{age} years old</Text> : null}
      </Pressable>
      {open ? <DateTimePicker value={dob} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={today} minimumDate={new Date(1900, 0, 1)}
        onChange={onChange} themeVariant="dark" textColor={C.text} /> : null}
      {minor ? <Text accessibilityLiveRegion="polite" style={s.errBox}>{AGE_MSG}</Text> : null}
      <ErrorText>{err}</ErrorText>
      <Btn title="Next" onPress={next} loading={busy} disabled={!touched} />
    </Screen>
  );
}

/* Step 12: Unique username with real-time availability check */
type Avail = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid' | 'error';
export function Username({ navigation }: P) {
  const { draft, refreshProfile, user } = useAuth();
  const m = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const first = draft.first || m.first_name || '', last = draft.last || m.last_name || '';
  const fullName = `${first} ${last}`.trim();
  const seed = `${first}${last ? '.' + last : ''}`.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20);
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

  const hint = { idle: '3 to 24 characters: letters, numbers, dots and underscores.', checking: 'Checking…', ok: `@${u} is available`, taken: `@${u} is taken`, invalid: '3 to 24 characters: letters, numbers, dots and underscores only.', error: 'Could not check right now. You can still try Next.' }[st];
  const suggestions = st === 'taken' ? [1, 2, 3].map(() => `${u.slice(0, 20)}${Math.floor(10 + Math.random() * 90)}`) : [];

  async function next() {
    if (!user || !USERNAME_RE.test(u)) return;
    setBusy(true); setErr(null);
    try {
      // remember that the photo step is still pending, so closing the app here resumes at the photo screen
      const { error: e1 } = await supabase.auth.updateUser({ data: { onboarding: 'photo' } });
      if (e1) throw e1;
      const { error } = await supabase.from('profiles').upsert({ id: user.id, username: u, name: fullName || null, updated_at: new Date().toISOString() });
      if (error) { if (error.code === '23505') { setSt('taken'); setErr('That username was just taken. Try another.'); return; } throw error; }
      // keep the date of birth in the private per-user state table (readable only by this user)
      if (m.dob) {
        const { data: row } = await supabase.from('user_state').select('state').eq('id', user.id).maybeSingle();
        await supabase.from('user_state').upsert({ id: user.id, state: { ...((row?.state as object) ?? {}), dob: m.dob, contact: user.email ?? user.phone ?? '' }, updated_at: new Date().toISOString() });
      }
      await refreshProfile();
      navigation.navigate('ProfilePhoto');
    } catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  return (
    <Screen>
      <Title>Choose a username</Title>
      <Sub>Pick a unique username. You can always change it later.</Sub>
      <Field label="Username" value={u} onChangeText={(t) => setU(t.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 24))} autoCapitalize="none" autoCorrect={false}
        ok={st === 'ok'} bad={st === 'taken' || st === 'invalid'} hint={hint}
        right={st === 'ok' ? <Text style={{ color: C.green, fontSize: 18 }}>✓</Text> : st === 'taken' ? <Text style={{ color: C.red, fontSize: 18 }}>✕</Text> : undefined} />
      {suggestions.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>{suggestions.map((x) => (
        <Pressable key={x} onPress={() => setU(x)} style={s.chip}><Text style={{ color: C.text }}>{x}</Text></Pressable>))}</View> : null}
      <ErrorText>{err}</ErrorText>
      <Btn title="Next" onPress={next} loading={busy} disabled={st === 'invalid' || st === 'taken' || st === 'checking' || !u} />
    </Screen>
  );
}

/* Step 13: Profile photo, gallery or camera (or skip) */
export function ProfilePhoto() {
  const { user, profile, refreshProfile } = useAuth();
  const [img, setImg] = useState<{ uri: string; base64: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const opts = { allowsEditing: true, aspect: [1, 1] as [number, number], quality: 0.7, base64: true };
  async function gallery() {
    setErr(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setErr('Photo access is off. Allow it in your phone settings, or tap Skip.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, ...opts });
    if (!r.canceled && r.assets[0]?.base64) setImg({ uri: r.assets[0].uri, base64: r.assets[0].base64 });
  }
  async function camera() {
    setErr(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return setErr('Camera access is off. Allow it in your phone settings, or choose from your gallery.');
    const r = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, ...opts });
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
      <Title>Add profile photo</Title>
      <Sub>Add a photo so your friends know it's you. You can skip this and add one later.</Sub>
      <View style={{ alignItems: 'center', marginVertical: 18 }}>
        {img ? <Image source={{ uri: img.uri }} style={s.avatar} accessibilityLabel="Your new profile photo" />
          : <View style={[s.avatar, s.avatarEmpty]}><Text style={{ color: C.text, fontSize: 56, fontWeight: '700' }}>{(profile?.username ?? '?').slice(0, 1).toUpperCase()}</Text></View>}
      </View>
      <ErrorText>{err}</ErrorText>
      {img ? <Btn title="Use this photo" onPress={() => finish(true)} loading={busy} /> : null}
      <Btn title="Choose from gallery" variant={img ? 'outline' : 'primary'} onPress={gallery} disabled={busy} />
      <Btn title="Take photo" variant="outline" onPress={camera} disabled={busy} />
      <View style={{ alignItems: 'center', marginTop: 20 }}><Link title="Skip" onPress={() => !busy && finish(false)} /></View>
    </Screen>
  );
}

/* Password reset: shown after the email link or the reset code */
export function ResetPassword() {
  const { endRecovery } = useAuth();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    if (pw.length < 6) return setErr('Your password needs at least 6 characters.');
    setBusy(true); setErr(null);
    try { const { error } = await supabase.auth.updateUser({ password: pw, data: { has_password: true } }); if (error) throw error; endRecovery(); }
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

/* Shown when someone under 18 tries to sign up */
export function Underage() {
  const { clearBlocked } = useAuth();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: C.text, fontSize: 64, fontWeight: '800' }}>18+</Text>
        <Title>You can't join yet</Title>
        <Sub style={{ textAlign: 'center' }}>{AGE_MSG}</Sub>
        <Btn title="OK" onPress={clearBlocked} style={{ alignSelf: 'stretch' }} />
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({
  big: { color: C.text, fontSize: 42, fontWeight: '800', textAlign: 'center' },
  note: { color: C.mute, fontSize: 13, marginBottom: 12, marginLeft: 4 },
  chip: { backgroundColor: C.field2, borderColor: C.border, borderWidth: 1, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14 },
  avatar: { width: 160, height: 160, borderRadius: 80 },
  avatarEmpty: { backgroundColor: C.field2, borderColor: C.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dobBtn: { backgroundColor: C.field, borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  errBox: { color: C.red, backgroundColor: '#2A1215', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 },
});
