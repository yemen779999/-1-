import { describe, it, expect, beforeEach } from 'vitest';
import { Database, getArabicDayName } from './utils.ts';
import { convertAmount } from './currencyUtils.ts';

// Mock localStorage if running in Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    length: 0,
    key: (_index: number) => null
  };
}

describe('ANAS Accounting System - Utility & Database Tests', () => {

  describe('getArabicDayName', () => {
    it('returns correct Arabic weekday name for valid date', () => {
      // 2026-06-01 was a Monday (الإثنين)
      const dayName = getArabicDayName('2026-06-01');
      expect(dayName).toBe('الإثنين');
    });

    it('returns empty string for invalid date', () => {
      expect(getArabicDayName('invalid-date')).toBe('');
    });
  });

  describe('convertAmount', () => {
    it('converts same currency without change', () => {
      expect(convertAmount(100, 'YER', 'YER')).toBe(100);
      expect(convertAmount(500, 'USD', 'USD')).toBe(500);
    });

    it('converts USD to YER accurately with given rates', () => {
      const customRates = { USD: 1.0, YER: 250.0 };
      expect(convertAmount(10, 'USD', 'YER', customRates)).toBe(2500);
    });

    it('converts YER to USD accurately', () => {
      const customRates = { USD: 1.0, YER: 250.0 };
      expect(convertAmount(2500, 'YER', 'USD', customRates)).toBe(10);
    });
  });

  describe('Database Class', () => {
    let db: Database;

    beforeEach(() => {
      // Clear localStorage before test
      localStorage.clear();
      db = new Database();
    });

    it('initializes with seed data when storage is empty', () => {
      expect(db.accounts.length).toBeGreaterThan(0);
      expect(db.transactions.length).toBeGreaterThan(0);
    });

    it('adds new account successfully', () => {
      const initialCount = db.accounts.length;
      const newAcc = db.addAccount({
        name: 'عميل تجريبي جديد',
        phone: '+967771112233',
        address: 'صنعاء',
        openingBalance: 5000,
        type: 'buyer',
        currency: 'YER'
      });

      expect(db.accounts.length).toBe(initialCount + 1);
      expect(newAcc.id).toBeDefined();
      expect(newAcc.name).toBe('عميل تجريبي جديد');
    });

    it('calculates buyer account balance correctly', () => {
      const newAcc = db.addAccount({
        name: 'مشتري الحسابات',
        phone: '+967700000000',
        address: 'عدن',
        openingBalance: 1000,
        type: 'buyer',
        currency: 'YER'
      });

      // Debit increases receivable amount
      db.addTransaction({
        accountId: newAcc.id,
        date: '2026-06-01',
        description: 'مبيعات آجل',
        type: 'debit',
        amount: 2500,
        currency: 'YER'
      });

      // Credit (payment from buyer) decreases receivable amount
      db.addTransaction({
        accountId: newAcc.id,
        date: '2026-06-02',
        description: 'تسديد دفعة',
        type: 'credit',
        amount: 1500,
        currency: 'YER'
      });

      // Balance = 1000 + 2500 - 1500 = 2000
      expect(db.getAccountBalance(newAcc.id)).toBe(2000);
    });

    it('calculates supplier account balance correctly', () => {
      const newAcc = db.addAccount({
        name: 'مورد أخشاب',
        phone: '+967700000001',
        address: 'تعز',
        openingBalance: 5000,
        type: 'supplier',
        currency: 'YER'
      });

      // Credit increases supplier payable
      db.addTransaction({
        accountId: newAcc.id,
        date: '2026-06-01',
        description: 'شراء بضاعة',
        type: 'credit',
        amount: 3000,
        currency: 'YER'
      });

      // Debit (payment to supplier) decreases payable
      db.addTransaction({
        accountId: newAcc.id,
        date: '2026-06-02',
        description: 'تسديد دفعة للمورد',
        type: 'debit',
        amount: 2000,
        currency: 'YER'
      });

      // Balance = 5000 + 3000 - 2000 = 6000
      expect(db.getAccountBalance(newAcc.id)).toBe(6000);
    });

    it('relational sync: adding daily ledger entry creates linked transaction', () => {
      const acc = db.addAccount({
        name: 'عميل ربط القيد',
        phone: '+967770000111',
        address: 'حديدة',
        openingBalance: 0,
        type: 'buyer',
        currency: 'YER'
      });

      const entry = db.addDailyLedgerEntry({
        dayNumber: 1,
        date: '2026-06-01',
        description: 'شراء مواد معمارية',
        quantity: 2,
        unitPrice: 500,
        extraCharges: 0,
        total: 1000,
        accountId: acc.id,
        accountType: 'buyer',
        transactionType: 'debit',
        currency: 'YER'
      });

      expect(entry.id).toBeDefined();
      const linkedTx = db.transactions.find(tx => tx.sourceEntryId === entry.id);
      expect(linkedTx).toBeDefined();
      expect(linkedTx?.amount).toBe(1000);
      expect(linkedTx?.accountId).toBe(acc.id);
    });

    it('exports and imports database state accurately', () => {
      const exported = db.exportState();
      expect(exported.accounts).toBeDefined();
      expect(exported.dailyEntries).toBeDefined();

      const newDb = new Database();
      newDb.importState(exported);
      expect(newDb.accounts.length).toBe(db.accounts.length);
    });
  });

});
