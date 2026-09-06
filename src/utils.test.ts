import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from './utils.ts';

// Mock localStorage in Node/Vitest environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock
  });
}

describe('Database System Tests', () => {
  let db: Database;

  beforeEach(() => {
    localStorage.clear();
    db = new Database();
  });

  it('initializes with default seed data when storage is empty', () => {
    expect(db.accounts.length).toBeGreaterThan(0);
    expect(db.transactions.length).toBeGreaterThan(0);
    expect(db.dailyEntries.length).toBeGreaterThan(0);
  });

  it('adds and calculates account balance correctly for supplier and buyer', () => {
    const supplier = db.addAccount({
      name: 'مورد اختبار',
      openingBalance: 1000,
      type: 'supplier',
      phone: '',
      address: '',
      currency: 'YER'
    });

    expect(db.getAccountBalance(supplier.id)).toBe(1000);

    // Credit transaction increases payable for supplier
    db.addTransaction({
      accountId: supplier.id,
      date: '2026-06-01',
      description: 'شراء بضاعة',
      type: 'credit',
      amount: 500,
      currency: 'YER'
    });

    expect(db.getAccountBalance(supplier.id)).toBe(1500);

    // Debit transaction reduces payable for supplier
    db.addTransaction({
      accountId: supplier.id,
      date: '2026-06-02',
      description: 'سداد دفعة',
      type: 'debit',
      amount: 700,
      currency: 'YER'
    });

    expect(db.getAccountBalance(supplier.id)).toBe(800);
  });

  it('relational sync between daily ledger entry and account transaction works', () => {
    const buyer = db.addAccount({
      name: 'عميل اختبار',
      openingBalance: 0,
      type: 'buyer',
      phone: '',
      address: '',
      currency: 'YER'
    });

    const initialTxCount = db.transactions.length;

    const entry = db.addDailyLedgerEntry({
      dayNumber: 1,
      date: '2026-06-01',
      description: 'مبيعات يومية للعميل',
      quantity: 10,
      unitPrice: 100,
      extraCharges: 0,
      total: 1000,
      accountId: buyer.id,
      accountType: 'buyer',
      transactionType: 'debit',
      currency: 'YER'
    });

    expect(db.transactions.length).toBe(initialTxCount + 1);
    const linkedTx = db.transactions.find(tx => tx.sourceEntryId === entry.id);
    expect(linkedTx).toBeDefined();
    expect(linkedTx?.amount).toBe(1000);
    expect(db.getAccountBalance(buyer.id)).toBe(1000);
  });

  it('handles soft deletion and moving records to recycle bin', () => {
    const account = db.addAccount({
      name: 'حساب ملغي',
      openingBalance: 500,
      type: 'buyer',
      phone: '',
      address: '',
      currency: 'YER'
    });

    expect(db.accounts.some(a => a.id === account.id)).toBe(true);

    db.deleteAccount(account.id);

    expect(db.accounts.some(a => a.id === account.id)).toBe(false);
    expect(db.deletedAccounts.some(a => a.id === account.id)).toBe(true);
  });
});
