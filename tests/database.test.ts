import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Database } from '../src/utils.ts';

// Mock localStorage for Node environment if missing
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    length: 0,
    key: (index: number) => Object.keys(store)[index] || null
  };
}

test('Database - account management and balance calculations', () => {
  const db = new Database();

  // Create a new supplier account
  const supplier = db.addAccount({
    name: 'مورد اختبار الخشب',
    phone: '+967770000000',
    address: 'صنعاء - شارع الخمسين',
    openingBalance: 10000,
    type: 'supplier',
    currency: 'YER',
    status: 'active'
  });

  assert.equal(supplier.name, 'مورد اختبار الخشب');
  assert.equal(db.getAccountBalance(supplier.id), 10000);

  // Add credit transaction (purchase) -> increases payable debt to supplier
  db.addTransaction({
    accountId: supplier.id,
    date: '2026-06-01',
    description: 'شراء بضاعة آجلة',
    type: 'credit',
    amount: 5000,
    currency: 'YER'
  });

  assert.equal(db.getAccountBalance(supplier.id), 15000);

  // Add debit transaction (payment) -> reduces payable debt to supplier
  db.addTransaction({
    accountId: supplier.id,
    date: '2026-06-02',
    description: 'تسديد نقدي',
    type: 'debit',
    amount: 3000,
    currency: 'YER'
  });

  assert.equal(db.getAccountBalance(supplier.id), 12000);
});

test('Database - 30-day daily entry ledger relational sync', () => {
  const db = new Database();

  const buyer = db.addAccount({
    name: 'عميل اختبار البناء',
    phone: '+967710000000',
    address: 'عدن',
    openingBalance: 0,
    type: 'buyer',
    currency: 'YER',
    status: 'active'
  });

  // Add daily ledger entry linked to buyer
  const entry = db.addDailyLedgerEntry({
    dayNumber: 1,
    date: '2026-06-01',
    description: 'مبيعات حديد تسليح',
    quantity: 10,
    unitPrice: 1000,
    extraCharges: 200,
    total: 10200,
    accountId: buyer.id,
    accountType: 'buyer',
    transactionType: 'debit',
    currency: 'YER'
  });

  // Verify relational transaction was automatically created in buyer's ledger
  const buyerTxs = db.transactions.filter(tx => tx.accountId === buyer.id);
  assert.equal(buyerTxs.length, 1);
  assert.equal(buyerTxs[0].sourceEntryId, entry.id);
  assert.equal(buyerTxs[0].amount, 10200);
  assert.equal(db.getAccountBalance(buyer.id), 10200);
});

test('Database - currency conversion system', () => {
  const db = new Database();
  db.updateExchangeRate('USD', 1.0);
  db.updateExchangeRate('YER', 530.0);

  // Convert 100 USD to YER
  const yerAmount = db.convertCurrency(100, 'USD', 'YER');
  assert.equal(yerAmount, 53000);

  // Convert 530 YER to USD
  const usdAmount = db.convertCurrency(530, 'YER', 'USD');
  assert.equal(usdAmount, 1.0);
});
