import { describe, it, expect, beforeEach } from 'vitest';
import { Database, getArabicDayName } from './utils.ts';

// Mock localStorage for node test environment
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

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('Database Core Operations', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should initialize with default seed data', () => {
    const db = new Database();
    expect(db.accounts.length).toBeGreaterThan(0);
    expect(db.primaryCurrency).toBe('YER');
  });

  it('should calculate supplier and buyer balances correctly', () => {
    const db = new Database();
    const newSupplier = db.addAccount({
      name: 'مورد اختبار',
      phone: '+96777000000',
      address: 'صنعاء',
      openingBalance: 1000,
      type: 'supplier',
      currency: 'YER'
    });

    expect(db.getAccountBalance(newSupplier.id)).toBe(1000);

    // Credit transaction increases supplier payable debt
    db.addTransaction({
      accountId: newSupplier.id,
      date: '2026-06-01',
      description: 'شراء بضاعة جديدة',
      type: 'credit',
      amount: 500,
      currency: 'YER'
    });

    expect(db.getAccountBalance(newSupplier.id)).toBe(1500);

    // Debit transaction reduces supplier payable debt
    db.addTransaction({
      accountId: newSupplier.id,
      date: '2026-06-02',
      description: 'سداد دفعة للمورد',
      type: 'debit',
      amount: 300,
      currency: 'YER'
    });

    expect(db.getAccountBalance(newSupplier.id)).toBe(1200);
  });

  it('should convert currency correctly', () => {
    const db = new Database();
    // YER default rate is 250, USD is 1.0
    const inUSD = db.convertCurrency(250, 'YER', 'USD');
    expect(inUSD).toBeCloseTo(1.0, 2);
  });

  it('should correctly format Arabic day names', () => {
    expect(getArabicDayName('2026-06-01')).toBe('الإثنين');
    expect(getArabicDayName('invalid-date')).toBe('غير محدد');
  });

  it('should export and import database state accurately', () => {
    const db = new Database();
    const exportedState = db.exportState();
    expect(exportedState).toHaveProperty('accounts');
    expect(exportedState).toHaveProperty('transactions');

    const db2 = new Database();
    db2.importState(exportedState);
    expect(db2.accounts.length).toBe(db.accounts.length);
  });
});
