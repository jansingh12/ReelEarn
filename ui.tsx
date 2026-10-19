import React, { ReactNode, useRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from './theme';

export function Screen({ children, onBack, scroll = true }: { children: ReactNode; onBack?: () => void; scroll?: boolean }) {
  const body = <View style={s.pad}>{children}</View>;
  return (
    <SafeAreaView style={s.root}>
      {onBack ? <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} style={s.back}><Text style={s.backTxt}>‹</Text></Pressable> : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>{body}</ScrollView> : body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export const Title = ({ children }: { children: ReactNode }) => <Text style={s.title}>{children}</Text>;
export const Sub = ({ children, style }: { children: ReactNode; style?: object }) => <Text style={[s.sub, style]}>{children}</Text>;
export const ErrorText = ({ children }: { children?: string | null }) => (children ? <Text accessibilityLiveRegion="polite" style={s.err}>{children}</Text> : null);

export function Field(props: TextInputProps & { label: string; hint?: string; ok?: boolean; bad?: boolean; right?: ReactNode }) {
  const { label, hint, ok, bad, right, style, ...rest } = props;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={[s.field, ok && { borderColor: C.green }, bad && { borderColor: C.red }]}>
        <TextInput placeholderTextColor={C.mute} accessibilityLabel={label} placeholder={label} selectionColor={C.blue} style={[s.input, style]} {...rest} />
        {right}
      </View>
      {hint ? <Text style={[s.hint, bad && { color: C.red }, ok && { color: C.green }]}>{hint}</Text> : null}
    </View>
  );
}
export function Btn({ title, onPress, loading, disabled, variant = 'primary', style }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'ghost' | 'outline'; style?: ViewStyle }) {
  const off = disabled || loading;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!off }} onPress={off ? undefined : onPress}
      style={({ pressed }) => [s.btn, variant === 'primary' && { backgroundColor: off ? C.blueDim : C.blue }, variant === 'outline' && { borderWidth: 1, borderColor: C.border }, pressed && { opacity: 0.8 }, style]}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={[s.btnTxt, variant === 'ghost' && { color: C.blue }]}>{title}</Text>}
    </Pressable>
  );
}
export const Link = ({ title, onPress, style }: { title: string; onPress: () => void; style?: object }) => (
  <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}><Text style={[s.link, style]}>{title}</Text></Pressable>
);
export function OtpBoxes({ value, onChange, length = 6, autoFocus }: { value: string; onChange: (v: string) => void; length?: number; autoFocus?: boolean }) {
  const ref = useRef<TextInput>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel={`${length}-digit code`} style={s.otpRow}>
      {Array.from({ length }).map((_, i) => (
        <View key={i} style={[s.otpBox, i === Math.min(value.length, length - 1) && { borderColor: C.blue }]}><Text style={s.otpTxt}>{value[i] ?? ''}</Text></View>
      ))}
      <TextInput ref={ref} value={value} onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))} keyboardType="number-pad"
        textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={length} autoFocus={autoFocus} caretHidden style={s.otpHidden} />
    </Pressable>
  );
}
export const Banner = ({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) => (
  <View style={s.banner}><Text style={s.bannerTxt}>{text}</Text>{action ? <Pressable onPress={onAction} hitSlop={8}><Text style={[s.bannerTxt, { color: C.blue, fontWeight: '700' }]}>{action}</Text></Pressable> : null}</View>
);
export const Divider = ({ text = 'OR' }: { text?: string }) => (
  <View style={s.divRow}><View style={s.divLine} /><Text style={s.divTxt}>{text}</Text><View style={s.divLine} /></View>
);
export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={s.sheet}>{children}</View></KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
export function StrengthBar({ password }: { password: string }) {
  let n = 0;
  if (password.length >= 6) n++;
  if (password.length >= 10) n++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) n++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) n++;
  const colors = [C.red, C.red, '#F5A623', C.green, C.green];
  const labels = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];
  const k = password.length < 6 ? 0 : Math.max(1, n);
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= k ? colors[k] : C.border }} />)}
      </View>
      {password ? <Text style={{ color: colors[k], fontSize: 13, marginTop: 6 }}>{labels[k]}</Text> : null}
    </View>
  );
}
const s = StyleSheet.create({
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  otpBox: { width: 46, height: 56, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.field, alignItems: 'center', justifyContent: 'center' },
  otpTxt: { color: C.text, fontSize: 24, fontWeight: '700' },
  otpHidden: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
  banner: { backgroundColor: '#2A1215', borderColor: C.red, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  bannerTxt: { color: C.text, fontSize: 13, flexShrink: 1 },
  root: { flex: 1, backgroundColor: C.bg },
  pad: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  back: { paddingHorizontal: 16, paddingTop: 4 }, backTxt: { color: C.text, fontSize: 36, lineHeight: 36 },
  title: { color: C.text, fontSize: 26, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  sub: { color: C.mute, fontSize: 15, lineHeight: 21, marginBottom: 22 },
  err: { color: C.red, fontSize: 14, marginBottom: 12 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.field, borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  input: { flex: 1, color: C.text, fontSize: 16, paddingVertical: 14 },
  hint: { color: C.mute, fontSize: 13, marginTop: 6, marginLeft: 4 },
  btn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnTxt: { color: C.text, fontSize: 16, fontWeight: '700' },
  link: { color: C.blue, fontSize: 14, fontWeight: '600' },
  divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 }, divLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  divTxt: { color: C.mute, marginHorizontal: 14, fontWeight: '700', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.field2, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, borderColor: C.border, borderWidth: 1 },
});
