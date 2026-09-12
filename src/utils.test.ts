import { Database, getArabicDayName } from './utils.ts';

// Mock localStorage for node / deno test environment
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
    value: localStorageMock,
    writable: true
  });
}

const isDeno = typeof (globalThis as any).Deno !== 'undefined';

if (isDeno) {
  const assert = (cond: boolean, msg?: string) => {
    if (!cond) throw new Error(msg || 'Assertion failed');
  };

  const assertEquals = (a: any, b: any) => {
    if (a !== b) throw new Error(`Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`);
  };

  const assertCloseTo = (a: number, b: number, precision = 2) => {
    const diff = Math.abs(a - b);
    if (diff > Math.pow(10, -precision)) {
      throw new Error(`Expected ${a} to be close to ${b}`);
    }
  };

  (globalThis as any).Deno.test('Database Core Operations - initialize with default seed data', () => {
    localStorageMock.clear();
    const db = new Database();
    assert(db.accounts.length > 0);
    assertEquals(db.primaryCurrency, 'YER');
  });

  (globalThis as any).Deno.test('Database Core Operations - calculate supplier and buyer balances', () => {
    localStorageMock.clear();
    const db = new Database();
    const newSupplier = db.addAccount({
      name: 'مورد اختبار',
      phone: '+96777000000',
      address: 'صنعاء',
      openingBalance: 1000,
      type: 'supplier',
      currency: 'YER'
    });

    assertEquals(db.getAccountBalance(newSupplier.id), 1000);

    db.addTransaction({
      accountId: newSupplier.id,
      date: '2026-06-01',
      description: 'شراء بضاعة جديدة',
      type: 'credit',
      amount: 500,
      currency: 'YER'
    });

    assertEquals(db.getAccountBalance(newSupplier.id), 1500);

    db.addTransaction({
      accountId: newSupplier.id,
      date: '2026-06-02',
      description: 'سداد دفعة للمورد',
      type: 'debit',
      amount: 300,
      currency: 'YER'
    });

    assertEquals(db.getAccountBalance(newSupplier.id), 1200);
  });

  (globalThis as any).Deno.test('Database Core Operations - convert currency correctly', () => {
    localStorageMock.clear();
    const db = new Database();
    const inUSD = db.convertCurrency(250, 'YER', 'USD');
    assertCloseTo(inUSD, 1.0, 2);
  });

  (globalThis as any).Deno.test('Database Core Operations - format Arabic day names', () => {
    assertEquals(getArabicDayName('2026-06-01'), 'الإثنين');
    assertEquals(getArabicDayName('invalid-date'), 'غير محدد');
  });

  (globalThis as any).Deno.test('Database Core Operations - export and import state', () => {
    localStorageMock.clear();
    const db = new Database();
    const exportedState = db.exportState();
    assert(typeof exportedState.accounts !== 'undefined');
    assert(typeof exportedState.transactions !== 'undefined');

    const db2 = new Database();
    db2.importState(exportedState);
    assertEquals(db2.accounts.length, db.accounts.length);
  });
} else {
  // Vitest / Node runtime
  const { describe, it, expect, beforeEach } = await import('vitest');

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

      db.addTransaction({
        accountId: newSupplier.id,
        date: '2026-06-01',
        description: 'شراء بضاعة جديدة',
        type: 'credit',
        amount: 500,
        currency: 'YER'
      });

      expect(db.getAccountBalance(newSupplier.id)).toBe(1500);

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
}
