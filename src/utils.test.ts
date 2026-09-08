import { describe, it, expect } from 'vitest';
import { Database, getSafeImageUrl } from './utils.ts';
import { convertAmount, formatCurrency } from './currencyUtils.ts';

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
    expect(getSafeImageUrl('/assets/icon.jpg')).toBe('/icon.jpg'.replace('/icon.jpg', '/assets/icon.jpg'));
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
    // 100 USD to SAR = 375
    expect(convertAmount(100, 'USD', 'SAR', rates)).toBe(375);
    // 375 SAR to USD = 100
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
    // Relational balance should now reflect 5200 debt for buyer
    const updatedBalance = db.getAccountBalance(acc.id);
    expect(updatedBalance).toBe(5200);
  });
});
