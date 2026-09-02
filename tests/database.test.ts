import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage if running in Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

import { Database } from '../src/utils.ts';
import { convertAmount, DEFAULT_RATES } from '../src/currencyUtils.ts';

describe('Database Core Operations & Relational Engine', () => {

  test('Database initializes with seed data or defaults', () => {
    localStorage.clear();
    const db = new Database();
    assert.ok(db.accounts.length > 0, 'Accounts should be seeded');
    assert.ok(db.transactions.length > 0, 'Transactions should be seeded');
    assert.ok(db.dailyEntries.length > 0, 'Daily entries should be seeded');
  });

  test('Account management - add, update, delete', () => {
    localStorage.clear();
    const db = new Database();

    const initialAccountCount = db.accounts.length;
    const newAcc = db.addAccount({
      name: 'مؤسسة الاختبار التجارية',
      phone: '+967770001122',
      address: 'صنعاء - شارع حده',
      openingBalance: 10000,
      type: 'buyer',
      currency: 'YER',
      status: 'active'
    });

    assert.equal(db.accounts.length, initialAccountCount + 1);
    assert.ok(newAcc.id.startsWith('acc_'));

    // Update account
    db.updateAccount({
      ...newAcc,
      name: 'مؤسسة الاختبار المحدثة'
    });
    const updated = db.accounts.find(a => a.id === newAcc.id);
    assert.equal(updated?.name, 'مؤسسة الاختبار المحدثة');

    // Delete account
    db.deleteAccount(newAcc.id);
    assert.equal(db.accounts.find(a => a.id === newAcc.id), undefined);
    assert.ok(db.deletedAccounts.some(a => a.id === newAcc.id));
  });

  test('Transactions and balance calculation', () => {
    localStorage.clear();
    const db = new Database();

    const acc = db.addAccount({
      name: 'عميل الفحص الحسابي',
      phone: '+967711223344',
      address: 'عدن',
      openingBalance: 5000,
      type: 'buyer',
      currency: 'YER'
    });

    // Debit transaction (+5000) for buyer
    db.addTransaction({
      accountId: acc.id,
      date: '2026-06-15',
      description: 'مبيعات منتجات زجاجية',
      type: 'debit',
      amount: 5000,
      currency: 'YER'
    }, false);

    assert.equal(db.getAccountBalance(acc.id), 10000);

    // Credit transaction (-3000 payment from buyer)
    db.addTransaction({
      accountId: acc.id,
      date: '2026-06-16',
      description: 'تسديد دفعة نقداً',
      type: 'credit',
      amount: 3000,
      currency: 'YER'
    }, false);

    assert.equal(db.getAccountBalance(acc.id), 7000);
  });

  test('Relational sync between 30-day daily entry and account transactions', () => {
    localStorage.clear();
    const db = new Database();

    const acc = db.addAccount({
      name: 'مورد اختبار المزامنة',
      phone: '+967733445566',
      address: 'تعز',
      openingBalance: 0,
      type: 'supplier',
      currency: 'YER'
    });

    const entry = db.addDailyLedgerEntry({
      dayNumber: 1,
      date: '2026-06-01',
      description: 'توريد كابلات كهربائية',
      quantity: 10,
      unitPrice: 500,
      extraCharges: 50,
      total: 5050,
      accountId: acc.id,
      accountType: 'supplier',
      transactionType: 'credit',
      currency: 'YER'
    });

    // Relational sync should have created a transaction in acc
    const linkedTx = db.transactions.find(tx => tx.sourceEntryId === entry.id);
    assert.ok(linkedTx, 'Linked transaction must exist');
    assert.equal(linkedTx?.amount, 5050);
    assert.equal(db.getAccountBalance(acc.id), 5050);

    // Updating entry should update the relational transaction
    db.updateDailyLedgerEntry({
      ...entry,
      quantity: 20,
      total: 10050
    });

    const updatedTx = db.transactions.find(tx => tx.sourceEntryId === entry.id);
    assert.equal(updatedTx?.amount, 10050);
    assert.equal(db.getAccountBalance(acc.id), 10050);
  });

  test('Multi-currency conversion calculations', () => {
    const convertedUSDToSAR = convertAmount(100, 'USD', 'SAR', DEFAULT_RATES);
    assert.equal(convertedUSDToSAR, 375);

    const convertedSARToUSD = convertAmount(375, 'SAR', 'USD', DEFAULT_RATES);
    assert.equal(convertedSARToUSD, 100);
  });

  test('Export and import state', () => {
    localStorage.clear();
    const db = new Database();
    const exported = db.exportState();

    assert.ok(exported.accounts);
    assert.ok(exported.transactions);
    assert.ok(exported.dailyEntries);

    const db2 = new Database();
    db2.importState(exported);

    assert.equal(db2.primaryCurrency, db.primaryCurrency);
  });
});
