// Bmm / Ako earnings and the cash Bmm holds for Ako. Pure functions over the loaded data.
import { num, splitOf } from './calc';
import type { DocDTO, ExpenseDTO, PayoutDTO } from './types';

export const inPeriod = (date: string, year: string, month: string) =>
  (!year || date.startsWith(year)) && (!month || date.slice(5, 7) === month);

const invoices = (docs: DocDTO[]) => docs.filter((d) => d.type === 'invoice' && !d.void);

export function earnings(docs: DocDTO[], expenses: ExpenseDTO[], payouts: PayoutDTO[], year: string, month: string) {
  const inv = invoices(docs).filter((d) => inPeriod(d.date, year, month));
  const done = inv.filter((d) => d.splitStatus === 'complete');
  const open = inv.filter((d) => d.splitStatus !== 'complete');
  const sum = (list: DocDTO[], f: (s: ReturnType<typeof splitOf>) => number) => list.reduce((t, d) => t + f(splitOf(d)), 0);

  const bmmItems = sum(done, (s) => s.bmmItems), bmmDelivery = sum(done, (s) => s.bmmDelivery), service = sum(done, (s) => s.service);
  const itemSales = sum(done, (s) => s.subtotal), akoItems = sum(done, (s) => s.akoItems), courier = sum(done, (s) => s.courier);
  const exp = expenses.filter((e) => inPeriod(e.date, year, month));
  const expenseTotal = exp.reduce((t, e) => t + num(e.amount), 0);

  // Cash by payment date: each payment is split in the same proportions as its invoice.
  let collected = 0, bmmCash = 0, akoCash = 0, courierCash = 0, unsplitCash = 0;
  for (const d of invoices(docs)) {
    const s = splitOf(d);
    for (const p of d.payments) {
      if (!inPeriod(p.date, year, month)) continue;
      const a = num(p.amount);
      collected += a;
      if (d.splitStatus !== 'complete' || s.total <= 0) { unsplitCash += a; continue; }
      bmmCash += a * (s.bmm / s.total); akoCash += a * (s.ako / s.total); courierCash += a * (s.courier / s.total);
    }
  }
  const paidToAko = payouts.filter((p) => inPeriod(p.date, year, month)).reduce((t, p) => t + num(p.amount), 0);
  const expensesFromCash = exp.filter((e) => e.paidFrom !== 'owner').reduce((t, e) => t + num(e.amount), 0);

  return {
    invoices: inv.length, splitCount: done.length, unsplitCount: open.length, unsplitTotal: sum(open, (s) => s.total),
    bmm: { items: bmmItems, delivery: bmmDelivery, service, total: bmmItems + bmmDelivery + service },
    ako: { sales: itemSales, bmmShare: bmmItems, items: akoItems, expenses: expenseTotal, total: akoItems - expenseTotal },
    courier,
    cash: { collected, bmm: bmmCash, ako: akoCash, courier: courierCash, unsplit: unsplitCash, paidToAko, expensesFromCash },
  };
}

// What Bmm owes Ako right now (all time): Ako's part of every payment on split invoices,
// minus what Bmm already handed over, minus expenses Bmm paid for Ako from that cash.
export function owedToAko(docs: DocDTO[], expenses: ExpenseDTO[], payouts: PayoutDTO[]) {
  const all = earnings(docs, expenses, payouts, '', '');
  return { balance: all.cash.ako - all.cash.paidToAko - all.cash.expensesFromCash, unsplitCash: all.cash.unsplit };
}
