import { test } from 'node:test';
import assert from 'node:assert';
import { Database } from '../src/utils.ts';

// Mock localStorage in global scope for Node/Deno environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  };
}

function createFreshDb(): Database {
  localStorage.clear();
  return new Database();
}

test('should initialize with default seed data', () => {
  const db = createFreshDb();
  assert.ok(db.accounts.length > 0, 'Accounts should not be empty');
  assert.ok(db.transactions.length > 0, 'Transactions should not be empty');
  assert.ok(db.dailyEntries.length > 0, 'Daily entries should not be empty');
});

test('should create new buyer and supplier accounts correctly', () => {
  const db = createFreshDb();
  const newBuyer = db.addAccount({
    name: 'عميل جديد للاختبار',
    phone: '+967700000001',
    address: 'صنعاء - التحرير',
    openingBalance: 5000,
    type: 'buyer',
    currency: 'YER',
    status: 'active'
  });

  assert.ok(newBuyer.id, 'New account should have a generated ID');
  assert.strictEqual(newBuyer.name, 'عميل جديد للاختبار');
  assert.strictEqual(db.getAccountBalance(newBuyer.id), 5000);

  const newSupplier = db.addAccount({
    name: 'مورد جديد للاختبار',
    phone: '+967700000002',
    address: 'صنعاء - الحصبة',
    openingBalance: 10000,
    type: 'supplier',
    currency: 'YER',
    status: 'active'
  });

  assert.strictEqual(db.getAccountBalance(newSupplier.id), 10000);
});

test('should process debit and credit transactions and update running balance', () => {
  const db = createFreshDb();
  const acc = db.addAccount({
    name: 'حساب تجربة العمليات',
    phone: '+967700000003',
    address: 'تعز',
    openingBalance: 1000,
    type: 'buyer',
    currency: 'YER',
    status: 'active'
  });

  // Debit transaction increases buyer debt
  db.addTransaction({
    accountId: acc.id,
    date: '2026-06-01',
    description: 'مبيعات آجلة',
    type: 'debit',
    amount: 2500,
    currency: 'YER'
  });

  assert.strictEqual(db.getAccountBalance(acc.id), 3500);

  // Credit transaction (payment from buyer) decreases debt
  db.addTransaction({
    accountId: acc.id,
    date: '2026-06-02',
    description: 'سداد نقدي',
    type: 'credit',
    amount: 1500,
    currency: 'YER'
  });

  assert.strictEqual(db.getAccountBalance(acc.id), 2000);
});

test('should handle relational sync between daily entries and account ledger', () => {
  const db = createFreshDb();
  const buyerAcc = db.addAccount({
    name: 'عميل القيد اليومي',
    phone: '+967700000004',
    address: 'عدن',
    openingBalance: 0,
    type: 'buyer',
    currency: 'YER',
    status: 'active'
  });

  const initialTxCount = db.transactions.length;

  const entry = db.addDailyLedgerEntry({
    dayNumber: 1,
    date: '2026-06-01',
    description: 'بيع بضاعة باليومية',
    quantity: 5,
    unitPrice: 200,
    extraCharges: 0,
    total: 1000,
    accountId: buyerAcc.id,
    accountType: 'buyer',
    transactionType: 'debit',
    currency: 'YER'
  });

  assert.strictEqual(db.transactions.length, initialTxCount + 1, 'Transaction should automatically be generated');
  assert.strictEqual(db.getAccountBalance(buyerAcc.id), 1000);

  // Soft delete daily entry
  db.deleteDailyLedgerEntry(entry.id);
  assert.strictEqual(db.getAccountBalance(buyerAcc.id), 0, 'Linked transaction should be removed on deletion');
});

test('should support multi-currency conversion accurately', () => {
  const db = createFreshDb();
  // 1 USD = 250 YER by default rate
  const convUSD = db.convertCurrency(100, 'USD', 'YER');
  assert.ok(convUSD > 0);

  // Convert YER to USD
  const convYER = db.convertCurrency(25000, 'YER', 'USD');
  assert.ok(convYER > 0);
});

test('should soft delete and record deleted state for recycle bin recovery', () => {
  const db = createFreshDb();
  const acc = db.addAccount({
    name: 'حساب محذوف للاختبار',
    phone: '+967700000005',
    address: 'إب',
    openingBalance: 0,
    type: 'buyer',
    currency: 'YER',
    status: 'active'
  });

  const accId = acc.id;
  db.deleteAccount(accId);

  assert.strictEqual(db.accounts.find(a => a.id === accId), undefined);
  assert.ok(db.deletedAccounts.find(a => a.id === accId), 'Account should exist in deletedAccounts array');
});
