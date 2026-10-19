/** Rupees with Indian digit grouping (works on every JS engine): 1234567 -> ₹12,34,567 */
const group = (v: number) => String(Math.abs(Math.round(v))).replace(/(\d)(?=(\d\d)+\d$)/g, '$1,');
export const inr = (n: number | string | null | undefined): string => { const v = Math.round(Number(n ?? 0)); return `${v < 0 ? '-' : ''}₹${group(v)}`; };
export const num = (n: number | string | null | undefined): string => `${Number(n ?? 0) < 0 ? '-' : ''}${group(Number(n ?? 0))}`;
