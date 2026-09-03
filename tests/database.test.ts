import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { Database } from '../src/utils.ts';
import { convertAmount, formatCurrency, getCurrencyInfo, DEFAULT_RATES } from '../src/currencyUtils.ts';

// Mock localStorage for Node environment if missing
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    length: 0,
    key: (_i: number) => null,
  };
}

test('Currency Utilities Test Suite', () => {
  // Test getCurrencyInfo
  const yerInfo = getCurrencyInfo('YER');
  assert.equal(yerInfo.code, 'YER');
  assert.equal(yerInfo.symbolAr, 'ر.ي');

  const unknownInfo = getCurrencyInfo('XYZ');
  assert.equal(unknownInfo.code, 'XYZ');

  // Test convertAmount
  // Default rates: USD = 1.0, YER = 250.0, SAR = 3.75
  const usdToYer = convertAmount(10, 'USD', 'YER', DEFAULT_RATES);
  assert.equal(usdToYer, 2500);

  const yerToUsd = convertAmount(2500, 'YER', 'USD', DEFAULT_RATES);
  assert.equal(yerToUsd, 10);

  // Test formatCurrency
  const formatted = formatCurrency(1000, 'YER');
  assert.ok(formatted.includes('1,000'));
  assert.ok(formatted.includes('ر.ي'));
});

test('Database Core Relational Engine Test Suite', () => {
  localStorage.clear();
  const db = new Database();

  // Test Initial Accounts Seed
  assert.ok(db.accounts.length > 0, 'Initial accounts should be loaded');

  // Add Account
  const newAccount = db.addAccount({
    name: 'اختبار شركة السلام',
    phone: '+967770001122',
    address: 'صنعاء',
    openingBalance: 10000,
    type: 'buyer',
    currency: 'YER',
    status: 'active'
  });

  assert.ok(newAccount.id.startsWith('acc_'));
  assert.equal(db.accounts.some(a => a.id === newAccount.id), true);

  // Calculate Initial Balance
  const initialBalance = db.getAccountBalance(newAccount.id);
  assert.equal(initialBalance, 10000);

  // Add Transaction to Account (Buyer debit increases receivable debt)
  const tx1 = db.addTransaction({
    accountId: newAccount.id,
    date: '2026-06-15',
    description: 'بيع منتجات أخشاب',
    type: 'debit',
    amount: 5000,
    currency: 'YER'
  });

  assert.ok(tx1.id.startsWith('tx_'));
  assert.equal(db.getAccountBalance(newAccount.id), 15000);

  // Add Credit Transaction (Payment received reduces buyer debt)
  db.addTransaction({
    accountId: newAccount.id,
    date: '2026-06-16',
    description: 'تسديد نقدي من الحساب',
    type: 'credit',
    amount: 3000,
    currency: 'YER'
  });

  assert.equal(db.getAccountBalance(newAccount.id), 12000);

  // Test Daily Ledger Entry relational sync
  const entry = db.addDailyLedgerEntry({
    dayNumber: 10,
    date: '2026-06-17',
    description: 'توريد مواد للعميل مع القيد اليومي',
    quantity: 2,
    unitPrice: 2000,
    extraCharges: 500,
    total: 4500,
    accountId: newAccount.id,
    accountType: 'buyer',
    transactionType: 'debit',
    currency: 'YER'
  });

  assert.ok(entry.id.startsWith('entry_'));
  // Linked transaction should be created automatically in transactions
  const linkedTx = db.transactions.find(t => t.sourceEntryId === entry.id);
  assert.ok(linkedTx, 'Relational transaction should be auto-created for daily entry with accountId');
  assert.equal(linkedTx?.amount, 4500);

  // Test Account Deletion and Soft Deletion Archive
  db.deleteAccount(newAccount.id);
  assert.equal(db.accounts.some(a => a.id === newAccount.id), false);
  assert.equal(db.deletedAccounts.some(a => a.id === newAccount.id), true);

  // Test Activity Log
  assert.ok(db.activityLogs.length > 0);
  assert.ok(db.activityLogs.some(l => l.details.includes('تم حذف الحساب')));

  // Test Export and Import State
  const exported = db.exportState();
  assert.ok(exported.accounts);
  assert.ok(exported.transactions);
  assert.ok(exported.dailyEntries);

  const db2 = new Database();
  db2.importState(exported);
  assert.equal(db2.activityLogs.length, db.activityLogs.length);
});
