import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../AuthContext';
import { DEFAULT_RULES, Rules, Summary, loadRules, loadSummary } from '../fund';
import { friendly } from '../lib';
import { inr, num } from '../money';
import { C } from '../theme';
import { Btn, Banner } from '../ui';
import Withdraw from './Withdraw';

const mon = (d: string) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
const day = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const STATUS: Record<string, { label: string; color: string }> = { pending: { label: 'Pending', color: '#F5A623' }, processing: { label: 'Processing', color: C.blue }, paid: { label: 'Paid', color: C.green }, rejected: { label: 'Rejected, refunded', color: C.red } };

export default function Wallet() {
  const { profile } = useAuth();
  const [sum, setSum] = useState<Summary | null>(null);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [withdraw, setWithdraw] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try { const [r, s] = await Promise.all([loadRules(), loadSummary()]); setRules(r); setSum(s); }
    catch (e) { setErr(/wallet_summary|schema cache|does not exist/i.test(String((e as any)?.message)) ? 'The Creator Fund tables are not set up yet. Run creator_fund.sql in the Supabase SQL Editor.' : friendly(e)); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (withdraw && sum) return <Withdraw rules={rules} balance={sum.balance} onClose={(changed) => { setWithdraw(false); if (changed) load(); }} />;
  if (!sum) return <View style={s.center}>{busy ? <ActivityIndicator color="#fff" /> : <><Banner text={err ?? 'Something went wrong.'} action="Retry" onAction={load} /></>}</View>;

  const goal = rules.min_followers, pct = Math.min(1, sum.eligible / goal), eligible = sum.eligible >= goal;
  const monthly = Math.min(rules.max_monthly_inr, Math.floor(sum.eligible * rules.rate_per_follower));
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor="#fff" />}>
      {err ? <Banner text={err} action="Retry" onAction={load} /> : null}
      <View style={s.head}>
        {profile?.photo_url ? <Image source={{ uri: profile.photo_url }} style={s.av} /> : <View style={[s.av, { backgroundColor: C.field2, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{(profile?.username ?? '?')[0].toUpperCase()}</Text></View>}
        <View><Text style={s.name}>{profile?.name ?? profile?.username}</Text><Text style={{ color: C.mute }}>@{profile?.username}</Text></View>
      </View>

      <View style={s.card}>
        <Text style={s.lbl}>Wallet balance</Text>
        <Text style={s.bal}>{inr(sum.balance)}</Text>
        {sum.pending_total > 0 ? <Text style={{ color: '#F5A623', marginTop: 4 }}>{inr(sum.pending_total)} in withdrawal requests being processed</Text> : null}
        <Btn title="Withdraw" onPress={() => setWithdraw(true)} disabled={sum.balance < rules.min_withdraw_inr} style={{ marginTop: 14 }} />
        {sum.balance < rules.min_withdraw_inr ? <Text style={s.note}>You can withdraw from {inr(rules.min_withdraw_inr)}. Up to {inr(rules.max_withdraw_inr)} per request, by UPI or bank transfer.</Text> : null}
      </View>

      <View style={s.card}>
        <Text style={s.lbl}>Creator Fund</Text>
        {!rules.enabled ? <Text style={s.note}>The Creator Fund is paused right now.</Text> : <>
          <Text style={s.big}>{num(sum.eligible)} <Text style={s.small}>of {num(goal)} eligible followers</Text></Text>
          <View style={s.track}><View style={[s.fill, { width: `${Math.max(2, pct * 100)}%` }]} /></View>
          <Text style={s.note}>{eligible ? `You qualify. Estimated this month: ${inr(sum.estimate || monthly)}` : `${num(goal - sum.eligible)} more eligible followers to start earning ${inr(goal * rules.rate_per_follower)} a month.`}</Text>
          <View style={s.row}><Stat k="All followers" v={num(sum.followers)} /><Stat k="Eligible" v={num(sum.eligible)} /><Stat k="Earned so far" v={inr(sum.earned_total)} /></View>
          <Text style={s.note}>Paid automatically on the 1st of each month into your wallet: {inr(rules.rate_per_follower * 1000)} per 1,000 eligible followers, from {num(goal)} followers, up to {inr(rules.max_monthly_inr)} a month. Eligible followers are real, verified accounts at least {rules.min_account_age_days} days old. No tasks needed.</Text>
        </>}
      </View>

      <Text style={s.sec}>Withdrawals</Text>
      {sum.withdrawals.length ? sum.withdrawals.map((w) => (
        <View key={w.id} style={s.item}>
          <View style={{ flex: 1 }}><Text style={s.t}>{inr(w.amount_inr)} · {w.method === 'upi' ? `UPI ${w.upi_id ?? ''}` : `Bank ••${w.last4 ?? ''}`}</Text><Text style={s.sm}>{day(w.created_at)}{w.admin_note ? ` · ${w.admin_note}` : ''}</Text></View>
          <Text style={{ color: STATUS[w.status].color, fontWeight: '700' }}>{STATUS[w.status].label}</Text>
        </View>)) : <Text style={s.empty}>No withdrawals yet.</Text>}

      <Text style={s.sec}>Monthly fund payouts</Text>
      {sum.payouts.length ? sum.payouts.map((p) => (
        <View key={p.month} style={s.item}><View style={{ flex: 1 }}><Text style={s.t}>{mon(p.month)}</Text><Text style={s.sm}>{num(p.followers)} eligible followers</Text></View><Text style={{ color: C.green, fontWeight: '700' }}>+{inr(p.amount_inr)}</Text></View>)) : <Text style={s.empty}>Your first payout appears after the next monthly run.</Text>}

      <Text style={s.sec}>Wallet history</Text>
      {sum.ledger.length ? sum.ledger.map((l, i) => (
        <View key={i} style={s.item}><View style={{ flex: 1 }}><Text style={s.t}>{l.note || l.kind}</Text><Text style={s.sm}>{day(l.created_at)}</Text></View><Text style={{ color: l.amount_inr < 0 ? C.text : C.green, fontWeight: '700' }}>{l.amount_inr < 0 ? '-' : '+'}{inr(Math.abs(l.amount_inr))}</Text></View>)) : <Text style={s.empty}>Nothing here yet.</Text>}
    </ScrollView>
  );
}
const Stat = ({ k, v }: { k: string; v: string }) => <View style={{ flex: 1 }}><Text style={s.statV}>{v}</Text><Text style={s.sm}>{k}</Text></View>;
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  av: { width: 56, height: 56, borderRadius: 28 }, name: { color: C.text, fontSize: 18, fontWeight: '700' },
  card: { backgroundColor: C.field, borderColor: C.border, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 },
  lbl: { color: C.mute, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 },
  bal: { color: C.text, fontSize: 40, fontWeight: '800', marginTop: 4 },
  big: { color: C.text, fontSize: 24, fontWeight: '800', marginTop: 6 }, small: { color: C.mute, fontSize: 14, fontWeight: '500' },
  track: { height: 8, backgroundColor: C.field2, borderRadius: 4, marginTop: 12, overflow: 'hidden' }, fill: { height: 8, backgroundColor: C.blue, borderRadius: 4 },
  note: { color: C.mute, fontSize: 13, lineHeight: 19, marginTop: 10 },
  row: { flexDirection: 'row', marginTop: 14 }, statV: { color: C.text, fontSize: 16, fontWeight: '700' },
  sec: { color: C.text, fontSize: 17, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.field, borderRadius: 12, padding: 12, marginBottom: 8 },
  t: { color: C.text, fontSize: 15 }, sm: { color: C.mute, fontSize: 12, marginTop: 2 }, empty: { color: C.mute, marginBottom: 8 },
});
