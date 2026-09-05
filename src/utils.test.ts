import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from './utils';
import { convertAmount, formatCurrency } from './currencyUtils';

describe('Currency Utilities', () => {
  it('converts same currency with 1:1 ratio', () => {
    expect(convertAmount(100, 'USD', 'USD')).toBe(100);
    expect(convertAmount(500, 'YER', 'YER')).toBe(500);
  });

  it('converts currencies correctly using rate table', () => {
    const rates = { USD: 1.0, YER: 250.0, SAR: 3.75 };
    // 100 USD to YER -> 100 * 250 = 25000
    expect(convertAmount(100, 'USD', 'YER', rates)).toBe(25000);
    // 25000 YER to USD -> 25000 / 250 = 100
    expect(convertAmount(25000, 'YER', 'USD', rates)).toBe(100);
  });

  it('formats currency with Arabic symbols', () => {
    const formatted = formatCurrency(1500, 'SAR', { showSymbol: true });
    expect(formatted).toContain('ر.س');
    expect(formatted).toContain('1,500');
  });
});

describe('Database Engine', () => {
  let db: Database;

  beforeEach(() => {
    // Clear localStorage mock if present
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    db = new Database();
  });

  it('initializes with seed data', () => {
    expect(db.accounts.length).toBeGreaterThan(0);
    expect(db.transactions.length).toBeGreaterThan(0);
    expect(db.dailyEntries.length).toBeGreaterThan(0);
  });

  it('creates and retrieves accounts', () => {
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

  it('calculates buyer account balance accurately', () => {
    const acc = db.addAccount({
      name: 'عميل اختبار الرصيد',
      phone: '+967711111111',
      address: 'تعز',
      openingBalance: 1000,
      type: 'buyer',
      currency: 'YER'
    });

    // Debit transaction increases buyer debt
    db.addTransaction({
      accountId: acc.id,
      date: '2026-06-01',
      description: 'مبيعات آجل',
      type: 'debit',
      amount: 2000,
      currency: 'YER'
    }, false);

    // Credit transaction reduces buyer debt
    db.addTransaction({
      accountId: acc.id,
      date: '2026-06-02',
      description: 'سداد نقدي',
      type: 'credit',
      amount: 500,
      currency: 'YER'
    }, false);

    // Expected balance = 1000 (opening) + 2000 (debit) - 500 (credit) = 2500
    const balance = db.getAccountBalance(acc.id);
    expect(balance).toBe(2500);
  });

  it('calculates supplier account balance accurately', () => {
    const acc = db.addAccount({
      name: 'مورد اختبار الرصيد',
      phone: '+967722222222',
      address: 'عدن',
      openingBalance: 3000,
      type: 'supplier',
      currency: 'YER'
    });

    // Credit transaction increases supplier payable
    db.addTransaction({
      accountId: acc.id,
      date: '2026-06-01',
      description: 'شراء بضاعة',
      type: 'credit',
      amount: 4000,
      currency: 'YER'
    }, false);

    // Debit transaction reduces supplier payable
    db.addTransaction({
      accountId: acc.id,
      date: '2026-06-02',
      description: 'دفعة سداد للمورد',
      type: 'debit',
      amount: 2000,
      currency: 'YER'
    }, false);

    // Expected balance = 3000 (opening) + 4000 (credit) - 2000 (debit) = 5000
    const balance = db.getAccountBalance(acc.id);
    expect(balance).toBe(5000);
  });

  it('syncs daily ledger entry to account transaction automatically', () => {
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

    // Check if entry was created
    expect(entry.id).toBeDefined();

    // Check if corresponding transaction was auto-posted to account
    const linkedTx = db.transactions.find(tx => tx.sourceEntryId === entry.id);
    expect(linkedTx).toBeDefined();
    expect(linkedTx?.amount).toBe(520);
    expect(linkedTx?.accountId).toBe(acc.id);
  });

  it('exports and imports database state cleanly', () => {
    const exportedState = db.exportState();
    expect(exportedState).toHaveProperty('accounts');
    expect(exportedState).toHaveProperty('transactions');
    expect(exportedState).toHaveProperty('dailyEntries');

    const newDb = new Database();
    newDb.importState(exportedState);
    expect(newDb.accounts.length).toBe(db.accounts.length);
  });
});
