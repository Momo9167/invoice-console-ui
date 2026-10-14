// Pure document maths shared by the browser and the API, so both always agree.
import type { DocDTO, LineItem, Status } from './types';

export const STATUSES: Status[] = ['unpaid', 'partial', 'paid', 'overdue', 'overpaid', 'void'];
export const PAY_METHODS = ['Cash', 'KBZPay', 'WavePay', 'AYA Pay', 'CB Pay', 'UAB Pay', 'Bank Transfer', 'Cheque', 'Other'];
export const EPS = 0.005;

export const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export const money = (n: unknown, currency = 'Ks') =>
  num(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;

// Dates are plain YYYY-MM-DD strings in the shop's local time.
const localISO = (dt: Date) => new Date(dt.getTime() - dt.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const today = () => {
  // Myanmar time (UTC+6:30) so the server on Vercel (UTC) agrees with the shop.
  const now = new Date(Date.now() + 6.5 * 3600e3);
  return now.toISOString().slice(0, 10);
};
export const addDays = (iso: string, n: number) => {
  const dt = new Date(iso + 'T00:00:00');
  dt.setDate(dt.getDate() + n);
  return localISO(dt);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 864e5);
export const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// Myanmar digits -> 0-9, so "၇ ရက်" works like "7 days".
export const latinDigits = (v: unknown) =>
  String(v ?? '').replace(/[၀-၉]/g, (c) => String(c.charCodeAt(0) - 0x1040));

// Due date from the terms field: "On Receipt", "N days", or an actual date.
export function dueDateOf(d: Pick<DocDTO, 'dueDate' | 'date'>) {
  const t = latinDigits(d.dueDate).trim();
  let m: RegExpMatchArray | null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if ((m = t.match(/(\d+)\s*(day|ရက်)/i))) return addDays(d.date || today(), +m[1]);
  return d.date || today(); // On Receipt / unknown -> due on the invoice date
}

export const splitSerials = (v: unknown) =>
  String(v ?? '').split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);

export const lineAmount = (it: LineItem) => num(it.qty) * num(it.price) - num(it.discount);

export function calc(d: Pick<DocDTO, 'items' | 'deliveryFee' | 'serviceCharge' | 'payments'>) {
  const lines = (d.items || []).map((it) => ({ ...it, amount: lineAmount(it) }));
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const delivery = num(d.deliveryFee);
  const service = num(d.serviceCharge);
  const total = subtotal + delivery + service;
  const paid = (d.payments || []).reduce((t, p) => t + num(p.amount), 0);
  return { lines, subtotal, delivery, service, total, paid, balance: total - paid };
}

export function statusOf(d: DocDTO): Status | null {
  if (d.type !== 'invoice') return null;
  if (d.void) return 'void';
  const c = calc(d);
  if (c.paid > c.total + EPS) return 'overpaid';
  if (c.total > 0 && c.balance <= EPS) return 'paid';
  if (dueDateOf(d) < today()) return 'overdue';
  return c.paid > 0 ? 'partial' : 'unpaid';
}

export const blankItem = (): LineItem => ({ description: '', serials: [], qty: 1, unit: 'pcs', price: '', discount: '' });
