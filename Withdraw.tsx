import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Rules, requestWithdrawal, validateWithdrawal } from '../fund';
import { friendly } from '../lib';
import { inr } from '../money';
import { C } from '../theme';
import { Btn, ErrorText, Field } from '../ui';

export default function Withdraw({ rules, balance, onClose }: { rules: Rules; balance: number; onClose: (changed: boolean) => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'upi' | 'bank'>('upi');
  const [upi, setUpi] = useState(''); const [holder, setHolder] = useState(''); const [bank, setBank] = useState(''); const [acc, setAcc] = useState(''); const [ifsc, setIfsc] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState<number | null>(null);
  const max = Math.min(balance, rules.max_withdraw_inr);

  async function submit() {
    const v = { amountText: amount, method, upi, holder, account: acc, ifsc };
    const bad = validateWithdrawal(v, rules, balance);
    if (bad) return setErr(bad);
    setBusy(true); setErr(null);
    try { await requestWithdrawal({ amount: Number(amount), method, upi: upi.trim(), holder: holder.trim(), bank: bank.trim(), account: acc, ifsc: ifsc.toUpperCase() }); setDone(Number(amount)); }
    catch (e) { setErr(friendly(e)); } finally { setBusy(false); }
  }
  if (done !== null) return (
    <View style={s.doneBox}>
      <Text style={{ fontSize: 56 }}>✓</Text><Text style={s.h}>Request sent</Text>
      <Text style={s.p}>{inr(done)} was taken from your wallet and your request is Pending. It moves to Processing and then Paid once it is reviewed and sent. If it is rejected, the money returns to your wallet.</Text>
      <Btn title="Done" onPress={() => onClose(true)} style={{ alignSelf: 'stretch', marginTop: 20 }} />
    </View>);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => onClose(false)} hitSlop={12}><Text style={{ color: C.blue, fontSize: 16 }}>‹ Wallet</Text></Pressable>
      <Text style={s.h}>Withdraw</Text>
      <Text style={s.p}>Available: {inr(balance)}. Minimum {inr(rules.min_withdraw_inr)}, maximum {inr(rules.max_withdraw_inr)} per request.</Text>
      <Field label="Amount (₹)" value={amount} onChangeText={(t) => setAmount(t.replace(/\D/g, '').slice(0, 7))} keyboardType="number-pad" hint={max >= rules.min_withdraw_inr ? undefined : 'Not enough balance'} />
      <Pressable onPress={() => setAmount(String(max))} style={{ marginTop: -6, marginBottom: 14 }}><Text style={{ color: C.blue }}>Withdraw maximum ({inr(max)})</Text></Pressable>
      <View style={s.tabs}>
        {(['upi', 'bank'] as const).map((m) => <Pressable key={m} onPress={() => { setMethod(m); setErr(null); }} style={[s.tab, method === m && { backgroundColor: C.blue }]}><Text style={{ color: '#fff', fontWeight: '700' }}>{m === 'upi' ? 'UPI' : 'Bank transfer'}</Text></Pressable>)}
      </View>
      {method === 'upi'
        ? <Field label="UPI ID (name@bank)" value={upi} onChangeText={setUpi} autoCapitalize="none" autoCorrect={false} />
        : <>
            <Field label="Account holder name" value={holder} onChangeText={setHolder} autoCapitalize="words" />
            <Field label="Bank name (optional)" value={bank} onChangeText={setBank} autoCapitalize="words" />
            <Field label="Account number" value={acc} onChangeText={(t) => setAcc(t.replace(/\D/g, '').slice(0, 18))} keyboardType="number-pad" />
            <Field label="IFSC code" value={ifsc} onChangeText={(t) => setIfsc(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} autoCapitalize="characters" autoCorrect={false} />
          </>}
      <ErrorText>{err}</ErrorText>
      <Btn title={amount ? `Withdraw ${inr(amount)}` : 'Withdraw'} onPress={submit} loading={busy} />
      <Text style={s.note}>Requests are reviewed and paid manually, usually within a few working days. Double-check your payout details: a wrong UPI ID or account number can delay or lose the payment.</Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  h: { color: C.text, fontSize: 26, fontWeight: '700', marginTop: 14, marginBottom: 6 }, p: { color: C.mute, lineHeight: 21, marginBottom: 18 },
  tabs: { flexDirection: 'row', backgroundColor: C.field, borderRadius: 12, padding: 4, marginBottom: 16 }, tab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 9 },
  note: { color: C.mute, fontSize: 13, lineHeight: 19, marginTop: 14 },
  doneBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
});
