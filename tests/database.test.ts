import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Database } from '../src/utils.ts';
import { convertAmount, DEFAULT_RATES } from '../src/currencyUtils.ts';

test('Currency Conversion Utils: convertAmount correctly converts USD to SAR and YER', () => {
  const sarAmount = convertAmount(100, 'USD', 'SAR', DEFAULT_RATES);
  assert.equal(sarAmount, 375);

  const usdAmount = convertAmount(375, 'SAR', 'USD', DEFAULT_RATES);
  assert.equal(usdAmount, 100);
});

test('Currency Conversion Utils: convertAmount handles same currency conversion', () => {
  const result = convertAmount(500, 'YER', 'YER', DEFAULT_RATES);
  assert.equal(result, 500);
});

test('Database Engine: addAccount creates a new account with default currency and status', () => {
  const db = new Database();
  const initialCount = db.accounts.length;

  const newAcc = db.addAccount({
    name: 'اختبار شركة السلام',
    phone: '+967771234567',
    address: 'صنعاء',
    openingBalance: 10000,
    type: 'buyer'
  });

  assert.equal(db.accounts.length, initialCount + 1);
  assert.equal(newAcc.name, 'اختبار شركة السلام');
  assert.equal(newAcc.currency, 'YER');
  assert.equal(newAcc.status, 'active');
});

test('Database Engine: getAccountBalance calculates buyer receivables correctly', () => {
  const db = new Database();
  const acc = db.addAccount({
    name: 'عميل اختبار',
    phone: '+967770001122',
    address: 'عدن',
    openingBalance: 5000,
    type: 'buyer',
    currency: 'YER'
  });

  // Debit transaction (+ sales increases receivable)
  db.addTransaction({
    accountId: acc.id,
    date: '2026-06-15',
    description: 'بيع مواد خشبية',
    type: 'debit',
    amount: 3000,
    currency: 'YER'
  });

  // Credit transaction (- payment decreases receivable)
  db.addTransaction({
    accountId: acc.id,
    date: '2026-06-16',
    description: 'تسديد نقدي',
    type: 'credit',
    amount: 2000,
    currency: 'YER'
  });

  const balance = db.getAccountBalance(acc.id);
  assert.equal(balance, 6000); // 5000 + 3000 - 2000
});

test('Database Engine: addDailyLedgerEntry automatically creates relational transaction when linked to an account', () => {
  const db = new Database();
  const acc = db.addAccount({
    name: 'مورد اختبار خرسانة',
    phone: '+967770009988',
    address: 'تعز',
    openingBalance: 0,
    type: 'supplier',
    currency: 'YER'
  });

  const initialTxCount = db.transactions.filter(t => t.accountId === acc.id).length;

  db.addDailyLedgerEntry({
    dayNumber: 1,
    date: '2026-06-16',
    description: 'شراء كتل إسمنتية',
    quantity: 10,
    unitPrice: 500,
    extraCharges: 0,
    total: 5000,
    accountId: acc.id,
    accountType: 'supplier',
    transactionType: 'credit',
    currency: 'YER'
  });

  const newTxCount = db.transactions.filter(t => t.accountId === acc.id).length;
  assert.equal(newTxCount, initialTxCount + 1);

  const supplierBalance = db.getAccountBalance(acc.id);
  assert.equal(supplierBalance, 5000); // Supplier credit purchase increases payable
});

test('Database Engine: deleteAccount soft-deletes account and moves it to deletedAccounts', () => {
  const db = new Database();
  const acc = db.addAccount({
    name: 'حساب سيحذف',
    phone: '+967770003344',
    address: 'المكلا',
    openingBalance: 100,
    type: 'buyer'
  });

  db.deleteAccount(acc.id);

  const foundActive = db.accounts.find(a => a.id === acc.id);
  const foundDeleted = db.deletedAccounts.find(a => a.id === acc.id);

  assert.equal(foundActive, undefined);
  assert.notEqual(foundDeleted, undefined);
});

test('Database Engine: addInvoice creates invoice record and optional ledger transaction', () => {
  const db = new Database();
  const acc = db.addAccount({
    name: 'عميل الفاتورة',
    phone: '+967770005566',
    address: 'إب',
    openingBalance: 0,
    type: 'buyer'
  });

  const inv = db.addInvoice({
    invoiceNumber: 'TEST-INV-101',
    date: '2026-06-16',
    accountId: acc.id,
    notes: 'اختبار الفاتورة',
    items: [
      { id: 'item_1', description: 'كرتون أخشاب', quantity: 2, unitPrice: 2000 }
    ],
    total: 4000,
    currency: 'YER',
    type: 'sale'
  });

  assert.equal(inv.invoiceNumber, 'TEST-INV-101');
  assert.equal(inv.total, 4000);
  assert.equal(db.invoices.some(i => i.id === inv.id), true);
});
