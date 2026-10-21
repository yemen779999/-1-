import { expect, test } from 'vitest';
import { Database } from '../src/utils.ts';
import { BackupService } from '../src/backupService.ts';

test('Database initializes with default accounts and transactions', () => {
  const db = new Database();
  expect(db.accounts.length).toBeGreaterThan(0);
  expect(db.transactions.length).toBeGreaterThan(0);
});

test('Currency conversion logic operates correctly', () => {
  const db = new Database();
  // Default YER rate in SUPPORTED_CURRENCIES is 250.0 against USD
  const usdInYer = db.convertCurrency(100, 'USD', 'YER');
  expect(usdInYer).toBe(25000);

  const yerInYer = db.convertCurrency(500, 'YER', 'YER');
  expect(yerInYer).toBe(500);
});

test('Account balance calculations for supplier and buyer', () => {
  const db = new Database();
  const supplier = db.addAccount({
    name: 'اختبار مورد',
    phone: '123456',
    address: 'test',
    openingBalance: 1000,
    type: 'supplier',
    currency: 'YER'
  });

  // Credit increases supplier debt (payable)
  db.addTransaction({
    accountId: supplier.id,
    date: '2026-06-01',
    description: 'شراء بضاعة',
    type: 'credit',
    amount: 500
  });

  expect(db.getAccountBalance(supplier.id)).toBe(1500);

  // Debit decreases supplier debt
  db.addTransaction({
    accountId: supplier.id,
    date: '2026-06-02',
    description: 'سداد دفعة',
    type: 'debit',
    amount: 300
  });

  expect(db.getAccountBalance(supplier.id)).toBe(1200);
});

test('Export and Import state integrity', () => {
  const db = new Database();
  const exported = db.exportState();
  expect(exported.accounts).toBeDefined();
  expect(exported.transactions).toBeDefined();

  const newDb = new Database();
  newDb.importState(exported);
  expect(newDb.accounts.length).toBe(db.accounts.length);
});

test('BackupService encrypts and decrypts state correctly', async () => {
  const userId = 'test_user_123';
  const service = new BackupService(userId);
  const sampleState = { key: 'value', number: 42 };

  // @ts-ignore - access private method for unit test validation
  const encrypted = service['encryptData'](JSON.stringify(sampleState));
  expect(typeof encrypted).toBe('string');
  expect(encrypted).not.toContain('value');

  // @ts-ignore - access private method for unit test validation
  const decryptedStr = service['decryptData'](encrypted);
  expect(JSON.parse(decryptedStr)).toEqual(sampleState);
});
