import { supabase } from './lib';

export type Rules = { enabled: boolean; rate_per_follower: number; min_followers: number; max_monthly_inr: number; min_account_age_days: number; min_withdraw_inr: number; max_withdraw_inr: number };
export type Summary = {
  balance: number; followers: number; eligible: number; estimate: number; earned_total: number; withdrawn_total: number; pending_total: number;
  ledger: { kind: 'fund' | 'withdrawal' | 'refund' | 'adjustment'; amount_inr: number; note: string; created_at: string }[];
  withdrawals: { id: string; amount_inr: number; method: 'upi' | 'bank'; status: 'pending' | 'processing' | 'paid' | 'rejected'; created_at: string; admin_note: string | null; upi_id: string | null; last4: string | null }[];
  payouts: { month: string; followers: number; amount_inr: number }[];
};
export const DEFAULT_RULES: Rules = { enabled: true, rate_per_follower: 0.1, min_followers: 5000, max_monthly_inr: 1000000, min_account_age_days: 7, min_withdraw_inr: 100, max_withdraw_inr: 500000 };

/** Rules come straight from the fund_settings table (public read), so changing a row changes the app. */
export async function loadRules(): Promise<Rules> {
  const { data, error } = await supabase.from('fund_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) return DEFAULT_RULES;
  return { ...data, rate_per_follower: Number(data.rate_per_follower), min_followers: Number(data.min_followers), max_monthly_inr: Number(data.max_monthly_inr), min_account_age_days: Number(data.min_account_age_days), min_withdraw_inr: Number(data.min_withdraw_inr), max_withdraw_inr: Number(data.max_withdraw_inr) } as Rules;
}
/** Balance, followers, ledger, payouts and withdrawals for the signed-in user (wallet_summary RPC). */
export async function loadSummary(): Promise<Summary> {
  const { data, error } = await supabase.rpc('wallet_summary');
  if (error) throw error;
  const d = data as any;
  return { ...d, balance: Number(d.balance), followers: Number(d.followers), eligible: Number(d.eligible), estimate: Number(d.estimate), earned_total: Number(d.earned_total), withdrawn_total: Number(d.withdrawn_total), pending_total: Number(d.pending_total) } as Summary;
}
export type WithdrawInput = { amount: number; method: 'upi' | 'bank'; upi?: string; holder?: string; bank?: string; account?: string; ifsc?: string };
export async function requestWithdrawal(w: WithdrawInput): Promise<string> {
  const { data, error } = await supabase.rpc('request_withdrawal', {
    p_amount: w.amount, p_method: w.method, p_upi: w.upi ?? null, p_holder: w.holder ?? null, p_bank: w.bank ?? null, p_account: w.account ?? null, p_ifsc: w.ifsc ?? null,
  });
  if (error) throw error;
  return data as string;
}
/** Same checks as the database function, so mistakes show up before the request is sent. */
export function validateWithdrawal(w: Partial<WithdrawInput> & { amountText: string }, r: Rules, balance: number): string | null {
  const a = Number(w.amountText);
  if (!w.amountText || !Number.isInteger(a)) return 'Enter the amount in whole rupees.';
  if (a < r.min_withdraw_inr) return `The minimum withdrawal is ₹${r.min_withdraw_inr}.`;
  if (a > r.max_withdraw_inr) return `The maximum per request is ₹${r.max_withdraw_inr.toLocaleString('en-IN')}.`;
  if (a > balance) return 'That is more than your wallet balance.';
  if (w.method === 'upi') { if (!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test((w.upi ?? '').trim())) return 'Enter a valid UPI ID, like name@bank.'; }
  else {
    if (!/^.{2,80}$/.test((w.holder ?? '').trim())) return 'Enter the account holder name.';
    if (!/^[0-9]{9,18}$/.test(w.account ?? '')) return 'The account number must be 9 to 18 digits.';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test((w.ifsc ?? '').toUpperCase())) return 'Enter a valid IFSC code (for example SBIN0001234).';
  }
  return null;
}
