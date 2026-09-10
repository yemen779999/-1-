import { Database } from './utils.ts';
import { convertAmount, DEFAULT_RATES } from './currencyUtils.ts';

const isDeno = typeof (globalThis as any).Deno !== 'undefined';

let testFn: (name: string, fn: () => void | Promise<void>) => void;
let expectFn: (actual: any) => { toBe: (expected: any) => void };

if (isDeno) {
  testFn = (name, fn) => (globalThis as any).Deno.test(name, fn);
  expectFn = (actual) => ({
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    }
  });
} else {
  const vitest = await import('vitest');
  testFn = vitest.test;
  expectFn = vitest.expect;
}

testFn('Currency conversion works correctly with default rates', () => {
  const amountInUSD = convertAmount(100, 'USD', 'YER', DEFAULT_RATES);
  expectFn(amountInUSD).toBe(25000);
});

testFn('Database account balance calculation works', () => {
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
  expectFn(initialBalance).toBe(1000);

  db.addTransaction({
    accountId: account.id,
    date: '2026-01-01',
    description: 'Test sale',
    type: 'debit',
    amount: 500
  }, false);

  const newBalance = db.getAccountBalance(account.id);
  expectFn(newBalance).toBe(1500);
});
