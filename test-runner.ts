/**
 * Automated test suite for ANAS Accounting System core logic.
 */

// Mock localStorage for Node environment if needed
if (typeof localStorage === 'undefined' || localStorage === null) {
  const storage: { [key: string]: string } = {};
  (global as any).localStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
}

import { Database } from './src/utils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('Starting ANAS Accounting System Core Unit Tests...\n');

  // Test 1: Database Initialization
  localStorage.clear();
  const db = new Database();
  assert(db.accounts.length > 0, 'Database initializes with default accounts');
  assert(db.primaryCurrency === 'YER', 'Default primary currency is YER');

  // Test 2: Multi-Currency Conversion
  const usdToYer = db.convertCurrency(100, 'USD', 'YER');
  assert(usdToYer > 100, '100 USD converts to a positive YER value');
  const sameCurr = db.convertCurrency(500, 'YER', 'YER');
  assert(sameCurr === 500, 'Converting same currency returns same amount');

  // Test 3: Account Balance Calculations
  // Create a supplier account
  const supplier = db.addAccount({
    name: 'مورد اختبار',
    phone: '+967771234567',
    address: 'صنعاء',
    openingBalance: 1000,
    type: 'supplier',
    currency: 'YER'
  });

  // Initial balance should equal opening balance
  assert(db.getAccountBalance(supplier.id) === 1000, 'Supplier initial balance equals opening balance');

  // Add credit transaction (purchase from supplier increases payable debt)
  db.addTransaction({
    accountId: supplier.id,
    date: '2026-06-01',
    description: 'شراء بضاعة آجلة',
    type: 'credit',
    amount: 5000,
    currency: 'YER'
  });
  assert(db.getAccountBalance(supplier.id) === 6000, 'Credit transaction increases supplier payable debt');

  // Add debit transaction (payment to supplier reduces payable debt)
  db.addTransaction({
    accountId: supplier.id,
    date: '2026-06-02',
    description: 'سداد دفعة للمورد',
    type: 'debit',
    amount: 2000,
    currency: 'YER'
  });
  assert(db.getAccountBalance(supplier.id) === 4000, 'Debit transaction reduces supplier payable debt');

  // Test 4: Buyer Account Balance Calculations
  const buyer = db.addAccount({
    name: 'عميل اختبار',
    phone: '+967772345678',
    address: 'عدن',
    openingBalance: 500,
    type: 'buyer',
    currency: 'YER'
  });

  // Add debit transaction (sale to buyer increases receivable debt)
  db.addTransaction({
    accountId: buyer.id,
    date: '2026-06-01',
    description: 'بيع بضاعة بالآجل',
    type: 'debit',
    amount: 3000,
    currency: 'YER'
  });
  assert(db.getAccountBalance(buyer.id) === 3500, 'Debit transaction increases buyer receivable debt');

  // Add credit transaction (payment from buyer reduces receivable debt)
  db.addTransaction({
    accountId: buyer.id,
    date: '2026-06-03',
    description: 'استلام دفعة نقدية من العميل',
    type: 'credit',
    amount: 1500,
    currency: 'YER'
  });
  assert(db.getAccountBalance(buyer.id) === 2000, 'Credit transaction reduces buyer receivable debt');

  // Test 5: Relational Sync with Daily Ledger Entry
  const dailyEntry = db.addDailyLedgerEntry({
    dayNumber: 10,
    date: '2026-06-10',
    description: 'توريد خشب لعميل الاختبار',
    quantity: 5,
    unitPrice: 1000,
    extraCharges: 100,
    total: 5000,
    accountId: buyer.id,
    accountType: 'buyer',
    transactionType: 'debit',
    currency: 'YER'
  });

  assert(db.getAccountBalance(buyer.id) === 7000, 'Adding daily ledger entry with linked account updates account balance');

  // Test 6: Deleting Daily Ledger Entry Syncs Relational Transaction
  db.deleteDailyLedgerEntry(dailyEntry.id);
  assert(db.getAccountBalance(buyer.id) === 2000, 'Deleting daily ledger entry removes relational transaction');

  // Test 7: Activity Log Recording
  assert(db.activityLogs.length > 0, 'Activity log records operations');

  console.log('\nAll core unit test assertions passed successfully! 🎉');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
