import { Database, getSafeImageUrl } from './utils.ts';
import { convertAmount, formatCurrency } from './currencyUtils.ts';

const isDeno = typeof (globalThis as any).Deno !== 'undefined';

if (isDeno) {
  const { test } = (globalThis as any).Deno;

  test('getSafeImageUrl sanitization - safe URLs', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    if (getSafeImageUrl(dataUrl) !== dataUrl) throw new Error('Data URL failed');
    if (getSafeImageUrl('https://example.com/image.png') !== 'https://example.com/image.png') throw new Error('HTTPS failed');
    if (getSafeImageUrl('http://example.com/image.jpg') !== 'http://example.com/image.jpg') throw new Error('HTTP failed');
    if (getSafeImageUrl('./assets/logo.png') !== './assets/logo.png') throw new Error('Relative path failed');
  });

  test('getSafeImageUrl sanitization - unsafe URLs', () => {
    if (getSafeImageUrl('javascript:alert(1)') !== '') throw new Error('JavaScript protocol not blocked');
    if (getSafeImageUrl('vbscript:msgbox') !== '') throw new Error('VBScript protocol not blocked');
    if (getSafeImageUrl(null) !== '') throw new Error('Null not handled');
    if (getSafeImageUrl(undefined) !== '') throw new Error('Undefined not handled');
  });

  test('Currency Utilities - conversion', () => {
    const rates = { USD: 1.0, SAR: 3.75, YER: 250.0 };
    if (convertAmount(100, 'USD', 'SAR', rates) !== 375) throw new Error('Conversion failed');
    if (convertAmount(375, 'SAR', 'USD', rates) !== 100) throw new Error('Reverse conversion failed');
  });

  test('Currency Utilities - formatting', () => {
    const formatted = formatCurrency(1250, 'YER', { showSymbol: true });
    if (!formatted.includes('1,250') || !formatted.includes('ر.ي')) throw new Error('Formatting failed');
  });

  test('Database Core - state export', () => {
    const db = new Database();
    const state = db.exportState();
    if (!Array.isArray(state.accounts)) throw new Error('Accounts not array');
    if (!Array.isArray(state.dailyEntries)) throw new Error('Daily entries not array');
    if (state.primaryCurrency !== 'YER') throw new Error('Primary currency not YER');
  });

  test('Database Core - add account and balance', () => {
    const db = new Database();
    const newAcc = db.addAccount({
      name: 'اختبار حساب المورد',
      phone: '+967770000000',
      address: 'صنعاء',
      openingBalance: 5000,
      type: 'supplier',
      currency: 'YER'
    });
    if (!newAcc.id) throw new Error('Account id missing');
    if (db.getAccountBalance(newAcc.id) !== 5000) throw new Error('Balance mismatch');
  });

  test('Database Core - daily entry relation', () => {
    const db = new Database();
    const acc = db.addAccount({
      name: 'اختبار حساب العميل',
      phone: '+967710000000',
      address: 'عدن',
      openingBalance: 0,
      type: 'buyer',
      currency: 'YER'
    });
    const entry = db.addDailyLedgerEntry({
      dayNumber: 1,
      date: '2026-06-16',
      description: 'بيع مواد بناء متعدده',
      quantity: 5,
      unitPrice: 1000,
      extraCharges: 200,
      total: 5200,
      accountId: acc.id,
      accountType: 'buyer',
      transactionType: 'debit',
      currency: 'YER'
    });
    if (!entry.id) throw new Error('Entry id missing');
    if (db.getAccountBalance(acc.id) !== 5200) throw new Error('Account balance mismatch');
  });
} else {
  const vitest = await import('vitest');
  const { describe, it, expect } = vitest;

  describe('getSafeImageUrl sanitization', () => {
    it('allows safe data URLs', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      expect(getSafeImageUrl(dataUrl)).toBe(dataUrl);
    });

    it('allows safe http and https URLs', () => {
      expect(getSafeImageUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
      expect(getSafeImageUrl('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
    });

    it('allows safe relative paths', () => {
      expect(getSafeImageUrl('/assets/icon.jpg')).toBe('/assets/icon.jpg');
      expect(getSafeImageUrl('./assets/logo.png')).toBe('./assets/logo.png');
      expect(getSafeImageUrl('../logo.png')).toBe('../logo.png');
    });

    it('blocks dangerous javascript: URLs and invalid inputs', () => {
      expect(getSafeImageUrl('javascript:alert(1)')).toBe('');
      expect(getSafeImageUrl('vbscript:msgbox')).toBe('');
      expect(getSafeImageUrl(null)).toBe('');
      expect(getSafeImageUrl(undefined)).toBe('');
    });
  });

  describe('Currency Utilities', () => {
    it('converts currencies accurately relative to USD base rates', () => {
      const rates = { USD: 1.0, SAR: 3.75, YER: 250.0 };
      expect(convertAmount(100, 'USD', 'SAR', rates)).toBe(375);
      expect(convertAmount(375, 'SAR', 'USD', rates)).toBe(100);
    });

    it('formats currency labels with symbols', () => {
      const formatted = formatCurrency(1250, 'YER', { showSymbol: true });
      expect(formatted).toContain('1,250');
      expect(formatted).toContain('ر.ي');
    });
  });

  describe('Database Core State Management', () => {
    it('initializes and exports state correctly', () => {
      const db = new Database();
      const state = db.exportState();
      expect(Array.isArray(state.accounts)).toBe(true);
      expect(Array.isArray(state.dailyEntries)).toBe(true);
      expect(state.primaryCurrency).toBe('YER');
    });

    it('adds account and calculates balance', () => {
      const db = new Database();
      const newAcc = db.addAccount({
        name: 'اختبار حساب المورد',
        phone: '+967770000000',
        address: 'صنعاء',
        openingBalance: 5000,
        type: 'supplier',
        currency: 'YER'
      });

      expect(newAcc.id).toBeDefined();
      expect(db.accounts.some(a => a.id === newAcc.id)).toBe(true);

      const balance = db.getAccountBalance(newAcc.id);
      expect(balance).toBe(5000);
    });

    it('handles relational daily entry addition', () => {
      const db = new Database();
      const acc = db.addAccount({
        name: 'اختبار حساب العميل',
        phone: '+967710000000',
        address: 'عدن',
        openingBalance: 0,
        type: 'buyer',
        currency: 'YER'
      });

      const entry = db.addDailyLedgerEntry({
        dayNumber: 1,
        date: '2026-06-16',
        description: 'بيع مواد بناء متعدده',
        quantity: 5,
        unitPrice: 1000,
        extraCharges: 200,
        total: 5200,
        accountId: acc.id,
        accountType: 'buyer',
        transactionType: 'debit',
        currency: 'YER'
      });

      expect(entry.id).toBeDefined();
      const updatedBalance = db.getAccountBalance(acc.id);
      expect(updatedBalance).toBe(5200);
    });
  });
}
