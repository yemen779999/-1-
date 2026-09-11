/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Database, getSafeImageUrl } from './utils.ts';
import { convertAmount, formatCurrency } from './currencyUtils.ts';

const isDeno = typeof (globalThis as unknown as { Deno?: unknown }).Deno !== 'undefined';

type TestFn = (name: string, fn: () => void | Promise<void>) => void;

let testRunner: TestFn;

if (isDeno) {
  testRunner = (globalThis as unknown as { Deno: { test: TestFn } }).Deno.test;
} else {
  const vitest = await import('vitest');
  testRunner = vitest.test;
}

function assertEquals(actual: unknown, expected: unknown, msg?: string) {
  if (actual !== expected) {
    throw new Error(msg || `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assert(condition: boolean, msg?: string) {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

testRunner('getSafeImageUrl sanitizes untrusted URLs', () => {
  assertEquals(getSafeImageUrl('https://example.com/logo.png'), 'https://example.com/logo.png');
  assertEquals(getSafeImageUrl('data:image/png;base64,123'), 'data:image/png;base64,123');
  assertEquals(getSafeImageUrl('javascript:alert(1)'), '');
  assertEquals(getSafeImageUrl(''), '');
});

testRunner('currency conversion calculates correctly', () => {
  const rates = { USD: 1.0, SAR: 3.75, YER: 250.0 };
  const amountInYER = convertAmount(100, 'USD', 'YER', rates);
  assertEquals(amountInYER, 25000);

  const amountInUSD = convertAmount(25000, 'YER', 'USD', rates);
  assertEquals(amountInUSD, 100);
});

testRunner('formatCurrency formats amounts properly', () => {
  const formatted = formatCurrency(1000, 'SAR', { showSymbol: true });
  assert(formatted.includes('1,000') || formatted.includes('١,٠٠٠'));
  assert(formatted.includes('ر.س'));
});

testRunner('Database class account and transaction balance calculation', () => {
  const db = new Database();
  const acc = db.addAccount({
    name: 'مؤسسة الاختبار والتجربة',
    phone: '+967770000000',
    address: 'صنعاء',
    openingBalance: 1000,
    type: 'buyer',
    currency: 'YER'
  });

  assertEquals(db.getAccountBalance(acc.id), 1000);

  db.addTransaction({
    accountId: acc.id,
    date: '2026-06-01',
    description: 'مبيعات اختبارية',
    type: 'debit',
    amount: 500,
    currency: 'YER'
  });

  assertEquals(db.getAccountBalance(acc.id), 1500);

  db.addTransaction({
    accountId: acc.id,
    date: '2026-06-02',
    description: 'تسديد من العميل',
    type: 'credit',
    amount: 300,
    currency: 'YER'
  });

  assertEquals(db.getAccountBalance(acc.id), 1200);
});
