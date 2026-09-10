import { test, expect } from 'vitest';
import { Database } from './utils.ts';
import { convertAmount, DEFAULT_RATES } from './currencyUtils.ts';

test('Currency conversion works correctly with default rates', () => {
  const amountInUSD = convertAmount(100, 'USD', 'YER', DEFAULT_RATES);
  expect(amountInUSD).toBe(25000);
});

test('Database account balance calculation works', () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  const db = new Database();
  const account = db.addAccount({
    name: 'Test Account',
    phone: '+967700000000',
    address: 'Sanaa',
    openingBalance: 1000,
    type: 'buyer',
    currency: 'YER'
  });

  const initialBalance = db.getAccountBalance(account.id);
  expect(initialBalance).toBe(1000);

  db.addTransaction({
    accountId: account.id,
    date: '2026-01-01',
    description: 'Test sale',
    type: 'debit',
    amount: 500
  }, false);

  const newBalance = db.getAccountBalance(account.id);
  expect(newBalance).toBe(1500);
});
