/**
 * Test: Multiple Work Orders for Same Vendor — Payment Flow
 *
 * Scenario: Vendor has 3 WOs (2 Fixed, 1 Periodic)
 * Tests: Can we raise payments against each WO independently?
 *        Does the correct WO balance update?
 *        Can we pay different WOs without interference?
 *
 * Run: node test-multi-wo.js
 */

const BASE = 'http://localhost:8000/api';
let TOKEN = '';
let results = { passed: 0, failed: 0, errors: [] };

async function api(endpoint, options = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
      ...options.headers,
    },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, ok: res.ok };
}

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    results.passed++;
  } else {
    console.log(`  ❌ ${testName}${detail ? ' — ' + detail : ''}`);
    results.failed++;
    results.errors.push(testName + (detail ? ': ' + detail : ''));
  }
}

const IDs = {};
const RUN = Date.now();

async function run() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Multi-WO Payment Test');
  console.log('═══════════════════════════════════════════════════');

  // ── LOGIN ──
  console.log('\n🔑 Login');
  const login = await api('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' }),
  });
  TOKEN = login.data.token;
  assert(!!TOKEN, 'Logged in');

  // ── CREATE VENDOR ──
  console.log('\n👤 Create Vendor');
  const vRes = await api('/vendors/', {
    method: 'POST',
    body: JSON.stringify({
      vendorName: `MultiWO Vendor ${RUN}`,
      panNumber: 'BBBPM1234A',
      contactPerson: 'Test Multi',
      phone: '9876500001',
      email: `multi${RUN}@test.com`,
      bankName: 'HDFC Bank',
      accountNumber: '555666777888',
      ifscCode: 'HDFC0001234',
      accountType: 'Current',
      tdsType: 'TDS @ 2% (Sec 194C)',
      status: 'Verified',
    }),
  });
  const vendor = vRes.data?.vendor || vRes.data;
  IDs.vendorId = vendor?.id;
  assert(!!IDs.vendorId, 'Vendor created');

  // ── CREATE 3 WORK ORDERS FOR SAME VENDOR ──
  console.log('\n📋 Create 3 Work Orders for Same Vendor');

  // WO1: Fixed ₹1,00,000
  const wo1 = await api('/work-orders/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderNumber: `WO-MWO-${RUN}-1`,
      vendorId: IDs.vendorId,
      type: 'Fixed',
      amount: 100000,
      tdsRate: 2,
      tdsComment: 'Sec 194C',
      serviceDescription: 'Photography for Event A',
      status: 'Issued',
    }),
  });
  IDs.wo1 = wo1.data?.id;
  assert(wo1.ok && !!IDs.wo1, `WO1 Fixed ₹1,00,000 created`);

  // WO2: Fixed ₹50,000
  const wo2 = await api('/work-orders/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderNumber: `WO-MWO-${RUN}-2`,
      vendorId: IDs.vendorId,
      type: 'Fixed',
      amount: 50000,
      tdsRate: 10,
      tdsComment: 'Sec 194J',
      serviceDescription: 'Videography for Event B',
      status: 'Issued',
    }),
  });
  IDs.wo2 = wo2.data?.id;
  assert(wo2.ok && !!IDs.wo2, `WO2 Fixed ₹50,000 created`);

  // WO3: Periodic ₹30,000 x 3
  const wo3 = await api('/work-orders/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderNumber: `WO-MWO-${RUN}-3`,
      vendorId: IDs.vendorId,
      type: 'Periodic',
      amount: 90000,
      amountPerPeriod: 30000,
      numberOfPeriods: 3,
      periodType: 'Monthly',
      tdsRate: 5,
      tdsComment: 'Sec 194C',
      serviceDescription: 'Monthly REP work',
      status: 'Issued',
    }),
  });
  IDs.wo3 = wo3.data?.id;
  assert(wo3.ok && !!IDs.wo3, `WO3 Periodic ₹30,000 × 3 created`);

  // ── VERIFY: All 3 WOs show up for this vendor ──
  console.log('\n🔍 Verify All 3 WOs Exist for Vendor');
  const woList = await api(`/work-orders/?vendor=${IDs.vendorId}`);
  const vendorWOs = woList.data?.workOrders || [];
  assert(vendorWOs.length === 3, `Vendor has 3 WOs (got ${vendorWOs.length})`);

  // ── PAY WO1 PARTIALLY (₹40,000 of ₹1,00,000) ──
  console.log('\n💰 Pay WO1 Partially — ₹40,000 of ₹1,00,000');
  const pr1 = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.wo1,
      vendorId: IDs.vendorId,
      grossAmount: 40000,
      tdsRate: 2,
      invoiceDate: '2026-03-20',
      notes: 'Partial payment WO1',
    }),
  });
  assert(pr1.ok, 'PR1 created for WO1');
  if (pr1.ok) {
    assert(parseFloat(pr1.data.tdsAmount) === 800, 'PR1 TDS = 40000 × 2% = 800');
    assert(parseFloat(pr1.data.netAmount) === 39200, 'PR1 Net = 40000 - 800 = 39200');
  }
  IDs.pr1 = pr1.data?.id;

  // Verify WO1 balance
  const wo1After = await api(`/work-orders/${IDs.wo1}/`);
  assert(parseFloat(wo1After.data.remaining) === 60000, 'WO1 remaining = 60000');
  assert(parseFloat(wo1After.data.paidGrossAmount) === 40000, 'WO1 paid = 40000');

  // Verify WO2 untouched
  const wo2Check = await api(`/work-orders/${IDs.wo2}/`);
  assert(parseFloat(wo2Check.data.remaining) === 50000, 'WO2 still untouched — remaining = 50000');
  assert(parseFloat(wo2Check.data.paidGrossAmount) === 0, 'WO2 paid = 0');

  // Verify WO3 untouched
  const wo3Check = await api(`/work-orders/${IDs.wo3}/`);
  assert(parseFloat(wo3Check.data.remaining) === 90000, 'WO3 still untouched — remaining = 90000');

  // ── PAY WO2 FULLY (₹50,000 of ₹50,000) ──
  console.log('\n💰 Pay WO2 Fully — ₹50,000 of ₹50,000');
  const pr2 = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.wo2,
      vendorId: IDs.vendorId,
      grossAmount: 50000,
      tdsRate: 10,
      invoiceDate: '2026-03-21',
      notes: 'Full payment WO2',
    }),
  });
  assert(pr2.ok, 'PR2 created for WO2');
  if (pr2.ok) {
    assert(parseFloat(pr2.data.tdsAmount) === 5000, 'PR2 TDS = 50000 × 10% = 5000');
    assert(parseFloat(pr2.data.netAmount) === 45000, 'PR2 Net = 50000 - 5000 = 45000');
  }
  IDs.pr2 = pr2.data?.id;

  // WO2 should be fully paid
  const wo2After = await api(`/work-orders/${IDs.wo2}/`);
  assert(parseFloat(wo2After.data.remaining) === 0, 'WO2 fully paid — remaining = 0');

  // WO1 should still have same balance
  const wo1Recheck = await api(`/work-orders/${IDs.wo1}/`);
  assert(parseFloat(wo1Recheck.data.remaining) === 60000, 'WO1 unaffected by WO2 payment — remaining still 60000');

  // ── PAY WO3 PERIOD 1 ──
  console.log('\n💰 Pay WO3 Period 1 — ₹30,000');
  const pr3 = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.wo3,
      vendorId: IDs.vendorId,
      grossAmount: 30000,
      tdsRate: 5,
      periodNumber: 1,
      periodLabel: 'Month 1 of 3',
      invoiceDate: '2026-03-22',
    }),
  });
  assert(pr3.ok, 'PR3 created for WO3 Period 1');
  IDs.pr3 = pr3.data?.id;
  if (pr3.ok) {
    assert(parseFloat(pr3.data.tdsAmount) === 1500, 'PR3 TDS = 30000 × 5% = 1500');
  }

  const wo3After1 = await api(`/work-orders/${IDs.wo3}/`);
  assert(wo3After1.data.paidPeriods?.includes(1), 'WO3 Period 1 marked paid');
  assert(!wo3After1.data.paidPeriods?.includes(2), 'WO3 Period 2 still unpaid');
  assert(parseFloat(wo3After1.data.remaining) === 60000, 'WO3 remaining = 60000');

  // ── PAY WO3 PERIOD 3 (skip Period 2) ──
  console.log('\n💰 Pay WO3 Period 3 (skipping Period 2)');
  const pr4 = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.wo3,
      vendorId: IDs.vendorId,
      grossAmount: 30000,
      tdsRate: 5,
      periodNumber: 3,
      periodLabel: 'Month 3 of 3',
      invoiceDate: '2026-03-23',
    }),
  });
  assert(pr4.ok, 'PR4 created for WO3 Period 3 (skipped Period 2)');
  IDs.pr4 = pr4.data?.id;

  const wo3After3 = await api(`/work-orders/${IDs.wo3}/`);
  assert(wo3After3.data.paidPeriods?.includes(1), 'WO3 Period 1 still paid');
  assert(!wo3After3.data.paidPeriods?.includes(2), 'WO3 Period 2 still unpaid');
  assert(wo3After3.data.paidPeriods?.includes(3), 'WO3 Period 3 now paid');
  assert(parseFloat(wo3After3.data.remaining) === 30000, 'WO3 remaining = 30000 (only Period 2 left)');

  // ── TRY TO OVERPAY WO2 (already fully paid) ──
  console.log('\n🚫 Try to Overpay Fully-Paid WO2');
  const overPay = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.wo2,
      vendorId: IDs.vendorId,
      grossAmount: 1000,
      tdsRate: 10,
      invoiceDate: '2026-03-24',
    }),
  });
  assert(!overPay.ok, 'Rejects payment on fully-paid WO2');

  // ── PAY WO1 REMAINING (₹60,000) ──
  console.log('\n💰 Pay WO1 Remaining — ₹60,000');
  const pr5 = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.wo1,
      vendorId: IDs.vendorId,
      grossAmount: 60000,
      tdsRate: 2,
      invoiceDate: '2026-03-25',
      notes: 'Final payment WO1',
    }),
  });
  assert(pr5.ok, 'PR5 created — WO1 final payment');
  IDs.pr5 = pr5.data?.id;

  const wo1Final = await api(`/work-orders/${IDs.wo1}/`);
  assert(parseFloat(wo1Final.data.remaining) === 0, 'WO1 fully paid — remaining = 0');

  // ── VERIFY ALL PAYMENT REQUESTS ──
  console.log('\n🔍 Verify All Payment Requests');
  const allPRs = await api('/payment-requests/');
  const prList = allPRs.data?.paymentRequests || [];
  assert(prList.length >= 5, `At least 5 PRs exist (got ${prList.length})`);

  // Count PRs per WO
  const wo1PRs = prList.filter(p => p.workOrderNumber === `WO-MWO-${RUN}-1`);
  const wo2PRs = prList.filter(p => p.workOrderNumber === `WO-MWO-${RUN}-2`);
  const wo3PRs = prList.filter(p => p.workOrderNumber === `WO-MWO-${RUN}-3`);
  assert(wo1PRs.length === 2, `WO1 has 2 payments (got ${wo1PRs.length})`);
  assert(wo2PRs.length === 1, `WO2 has 1 payment (got ${wo2PRs.length})`);
  assert(wo3PRs.length === 2, `WO3 has 2 payments (got ${wo3PRs.length})`);

  // ── VERIFY TDS — should have 5 TDS records (all had TDS > 0) ──
  console.log('\n🧾 Verify TDS Records');
  const tds = await api('/tds/');
  const tdsRecords = tds.data?.tdsRecords || [];
  assert(tdsRecords.length >= 5, `At least 5 TDS records (got ${tdsRecords.length})`);

  // Different TDS rates should be recorded correctly
  const tds2pct = tdsRecords.filter(t => t.rate === '2.00%' || t.rate === '2%');
  const tds5pct = tdsRecords.filter(t => t.rate === '5.00%' || t.rate === '5%');
  const tds10pct = tdsRecords.filter(t => t.rate === '10.00%' || t.rate === '10%');
  assert(tds2pct.length >= 2, `2% TDS records: ${tds2pct.length} (expected 2 from WO1)`);
  assert(tds5pct.length >= 2, `5% TDS records: ${tds5pct.length} (expected 2 from WO3)`);
  assert(tds10pct.length >= 1, `10% TDS records: ${tds10pct.length} (expected 1 from WO2)`);

  // ── PAY WO3 PERIOD 2 (the skipped one) ──
  console.log('\n💰 Pay WO3 Period 2 (the skipped one) — Fully Clears WO3');
  const pr6 = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.wo3,
      vendorId: IDs.vendorId,
      grossAmount: 30000,
      tdsRate: 5,
      periodNumber: 2,
      periodLabel: 'Month 2 of 3',
      invoiceDate: '2026-03-26',
    }),
  });
  assert(pr6.ok, 'PR6 created for WO3 Period 2');
  IDs.pr6 = pr6.data?.id;

  const wo3Final = await api(`/work-orders/${IDs.wo3}/`);
  assert(parseFloat(wo3Final.data.remaining) === 0, 'WO3 fully paid — remaining = 0');
  assert(wo3Final.data.paidPeriods?.length === 3, 'WO3 all 3 periods paid');

  // ── ALL WOs FULLY PAID — verify no more payments possible ──
  console.log('\n🚫 All WOs Fully Paid — No More Payments');
  for (const [name, woId] of [['WO1', IDs.wo1], ['WO2', IDs.wo2], ['WO3', IDs.wo3]]) {
    const reject = await api('/payment-requests/', {
      method: 'POST',
      body: JSON.stringify({
        workOrderId: woId,
        vendorId: IDs.vendorId,
        grossAmount: 1000,
        tdsRate: 2,
        invoiceDate: '2026-03-27',
      }),
    });
    assert(!reject.ok, `${name} rejects payment (fully paid)`);
  }

  // ── CLEANUP ──
  console.log('\n🧹 Cleanup');
  const cleanPRs = await api('/payment-requests/');
  for (const pr of (cleanPRs.data?.paymentRequests || [])) {
    await api(`/payment-requests/${pr.id}/`, { method: 'DELETE' });
  }
  console.log('  ✅ PRs deleted');

  for (const woId of [IDs.wo1, IDs.wo2, IDs.wo3]) {
    if (woId) await api(`/work-orders/${woId}/`, { method: 'DELETE' });
  }
  console.log('  ✅ WOs deleted');

  if (IDs.vendorId) await api(`/vendors/${IDs.vendorId}/`, { method: 'DELETE' });
  console.log('  ✅ Vendor deleted');

  // ── RESULTS ──
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  RESULTS: ${results.passed} passed, ${results.failed} failed`);
  console.log('═══════════════════════════════════════════════════');
  if (results.errors.length > 0) {
    console.log('\n  Failed tests:');
    results.errors.forEach(e => console.log(`    ❌ ${e}`));
  }
  console.log('');
  process.exit(results.failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
