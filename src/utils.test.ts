import { test, expect } from 'vitest';
import { Database } from './utils.ts';
import { convertAmount, formatCurrency } from './currencyUtils.ts';

test('converts same currency with 1:1 ratio', () => {
  expect(convertAmount(100, 'USD', 'USD')).toBe(100);
  expect(convertAmount(500, 'YER', 'YER')).toBe(500);
});

test('converts currencies correctly using rate table', () => {
  const rates = { USD: 1.0, YER: 250.0, SAR: 3.75 };
  expect(convertAmount(100, 'USD', 'YER', rates)).toBe(25000);
  expect(convertAmount(25000, 'YER', 'USD', rates)).toBe(100);
});

test('formats currency with Arabic symbols', () => {
  const formatted = formatCurrency(1500, 'SAR', { showSymbol: true });
  expect(formatted).toContain('ر.س');
  expect(formatted).toContain('1,500');
});

test('Database Engine initializes with seed data', () => {
  const db = new Database();
  expect(db.accounts.length).toBeGreaterThan(0);
  expect(db.transactions.length).toBeGreaterThan(0);
  expect(db.dailyEntries.length).toBeGreaterThan(0);
});

test('creates and retrieves accounts', () => {
  const db = new Database();
  const newAcc = db.addAccount({
    name: 'اختبار عميل جديد',
    phone: '+967700000000',
    address: 'صنعاء',
    openingBalance: 5000,
    type: 'buyer',
    currency: 'YER'
  });

  expect(newAcc.id).toBeDefined();
  expect(db.accounts.some(a => a.id === newAcc.id)).toBe(true);
});

test('calculates buyer account balance accurately', () => {
  const db = new Database();
  const acc = db.addAccount({
    name: 'عميل اختبار الرصيد',
    phone: '+967711111111',
    address: 'تعز',
    openingBalance: 1000,
    type: 'buyer',
    currency: 'YER'
  });

  db.addTransaction({
    accountId: acc.id,
    date: '2026-06-01',
    description: 'مبيعات آجل',
    type: 'debit',
    amount: 2000,
    currency: 'YER'
  }, false);

  db.addTransaction({
    accountId: acc.id,
    date: '2026-06-02',
    description: 'سداد نقدي',
    type: 'credit',
    amount: 500,
    currency: 'YER'
  }, false);

  const balance = db.getAccountBalance(acc.id);
  expect(balance).toBe(2500);
});

test('calculates supplier account balance accurately', () => {
  const db = new Database();
  const acc = db.addAccount({
    name: 'مورد اختبار الرصيد',
    phone: '+967722222222',
    address: 'عدن',
    openingBalance: 3000,
    type: 'supplier',
    currency: 'YER'
  });

  db.addTransaction({
    accountId: acc.id,
    date: '2026-06-01',
    description: 'شراء بضاعة',
    type: 'credit',
    amount: 4000,
    currency: 'YER'
  }, false);

  db.addTransaction({
    accountId: acc.id,
    date: '2026-06-02',
    description: 'دفعة سداد للمورد',
    type: 'debit',
    amount: 2000,
    currency: 'YER'
  }, false);

  const balance = db.getAccountBalance(acc.id);
  expect(balance).toBe(5000);
});

test('syncs daily ledger entry to account transaction automatically', () => {
  const db = new Database();
  const acc = db.addAccount({
    name: 'عميل القيد اليومي',
    phone: '+967733333333',
    address: 'المكلا',
    openingBalance: 0,
    type: 'buyer',
    currency: 'YER'
  });

  const entry = db.addDailyLedgerEntry({
    dayNumber: 10,
    date: '2026-06-10',
    description: 'توريد كابلات',
    quantity: 5,
    unitPrice: 100,
    extraCharges: 20,
    total: 520,
    accountId: acc.id,
    accountType: 'buyer',
    transactionType: 'debit',
    currency: 'YER'
  });

  expect(entry.id).toBeDefined();

  const linkedTx = db.transactions.find(tx => tx.sourceEntryId === entry.id);
  expect(linkedTx).toBeDefined();
  expect(linkedTx?.amount).toBe(520);
  expect(linkedTx?.accountId).toBe(acc.id);
});

test('exports and imports database state cleanly', () => {
  const db = new Database();
  const exportedState = db.exportState();
  expect(exportedState).toHaveProperty('accounts');
  expect(exportedState).toHaveProperty('transactions');
  expect(exportedState).toHaveProperty('dailyEntries');

  const newDb = new Database();
  newDb.importState(exportedState);
  expect(newDb.accounts.length).toBe(db.accounts.length);
});
