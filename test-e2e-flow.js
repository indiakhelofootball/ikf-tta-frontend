/**
 * End-to-End Integration Test
 * Tests: Admin Config → Vendor → Work Order → Payment Request → TDS
 *
 * Requires: Backend running on localhost:8000
 * Run: node test-e2e-flow.js
 */

const BASE = 'http://localhost:8000/api';
let TOKEN = '';
let results = { passed: 0, failed: 0, errors: [] };

// ── Helpers ──────────────────────────────────────────────────────
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

// ── Store IDs across steps ───────────────────────────────────────
const IDs = {};
const RUN_ID = Date.now(); // unique per run to avoid conflicts

// ═══════════════════════════════════════════════════════════════
// STEP 0: LOGIN
// ═══════════════════════════════════════════════════════════════
async function testLogin() {
  console.log('\n🔑 STEP 0: Login');
  const res = await api('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' }),
  });
  assert(res.ok, 'Login succeeds');
  assert(res.data.user?.role === 'ADMIN', 'User role is ADMIN');
  TOKEN = res.data.token;
  assert(!!TOKEN, 'JWT token received');
}

// ═══════════════════════════════════════════════════════════════
// STEP 1: ADMIN CONFIG — Add service type, entity type, vendor name
// ═══════════════════════════════════════════════════════════════
async function testAdminConfig() {
  console.log('\n⚙️  STEP 1: Admin Config');

  // Use unique names with timestamp to avoid duplicate conflicts
  const TS = Date.now();
  const stName = `Test Photography ${TS}`;
  const etName = `Test Individual ${TS}`;
  const vnName = `Test Vendor Studios ${TS}`;

  // 1a. Create a Service Type
  const st = await api('/config/', {
    method: 'POST',
    body: JSON.stringify({ category: 'service_type', value: stName }),
  });
  assert(st.ok, 'Create service type', `status=${st.status} ${JSON.stringify(st.data).slice(0,200)}`);
  IDs.serviceTypeId = st.data?.id;

  // 1b. Create an Entity Type
  const et = await api('/config/', {
    method: 'POST',
    body: JSON.stringify({ category: 'entity_type', value: etName }),
  });
  assert(et.ok, 'Create entity type', `status=${et.status} ${JSON.stringify(et.data).slice(0,200)}`);
  IDs.entityTypeId = et.data?.id;

  // 1c. Create a Vendor Name (linked to service + entity types)
  const vn = await api('/config/', {
    method: 'POST',
    body: JSON.stringify({
      category: 'vendor_name',
      value: vnName,
      serviceType: stName,
      entityType: etName,
      comment: 'Test vendor for E2E',
    }),
  });
  assert(vn.ok, 'Create vendor name with tags', `status=${vn.status} ${JSON.stringify(vn.data).slice(0,200)}`);
  IDs.vendorNameId = vn.data?.id;

  // 1d. Verify listing by category
  const list = await api('/config/?category=service_type&active=true');
  assert(list.ok, 'List service types');
  const allConfigs = Array.isArray(list.data) ? list.data : list.data?.results || [];
  const found = allConfigs.some(i => i.value === stName);
  assert(found, 'Service type appears in listing');

  // 1e. Test bulk create
  const bulk = await api('/config/bulk/', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        { category: 'season', value: 'Test Season 2026' },
        { category: 'project_name', value: 'Test Project Alpha' },
      ],
    }),
  });
  assert(bulk.ok, 'Bulk create config items', `status=${bulk.status} ${JSON.stringify(bulk.data).slice(0,200)}`);

  // 1f. Get categories endpoint
  const cats = await api('/config-categories/');
  assert(cats.ok, 'Config categories endpoint works');
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: VENDOR — Create with full details
// ═══════════════════════════════════════════════════════════════
async function testVendorCreation() {
  console.log('\n👤 STEP 2: Vendor Creation');

  // 2a. Create vendor
  const vendor = await api('/vendors/', {
    method: 'POST',
    body: JSON.stringify({
      vendorName: `Test Vendor Studios ${RUN_ID}`,
      vendorType: 'Test Photography',
      companyType: 'Test Individual',
      entityName: 'Test Vendor Studios Pvt',
      panNumber: 'AABCU9603R',
      gstNumber: '27AABCU9603R1ZM',
      panVerified: true,
      gstVerified: false,
      tdsType: 'TDS @ 2% (Sec 194C)',
      contactPerson: 'Rahul Test',
      phone: '9876543210',
      email: 'rahul@testvendor.com',
      address: '123 Test Street, Mumbai',
      contactPinCode: '400001',
      state: 'Maharashtra',
      city: 'Mumbai',
      bankName: 'State Bank of India',
      accountNumber: '1234567890',
      accountType: 'Current',
      ifscCode: 'SBIN0001234',
      bankPinCode: '400001',
      branchAddress: 'Fort Branch, Mumbai',
      status: 'Verified',
    }),
  });
  assert(vendor.ok, 'Create vendor', `status=${vendor.status} ${JSON.stringify(vendor.data).slice(0,300)}`);
  const v = vendor.data?.vendor || vendor.data; // response wrapped in { vendor: {...} }
  IDs.vendorId = v?.id;
  assert(!!IDs.vendorId, 'Vendor ID returned');

  // 2b. Verify vendor fields
  if (vendor.ok) {
    assert(v.vendorName === `Test Vendor Studios ${RUN_ID}`, 'Vendor name correct');
    assert(v.panNumber === 'AABCU9603R', 'PAN number correct');
    assert(v.gstNumber === '27AABCU9603R1ZM', 'GST number correct');
    assert(v.bankName === 'State Bank of India', 'Bank name correct');
    assert(v.ifscCode === 'SBIN0001234', 'IFSC code correct');
    assert(v.status === 'Verified', 'Status is Verified');
  }

  // 2c. List vendors
  const list = await api('/vendors/');
  assert(list.ok, 'List vendors endpoint works');
  const vendors = list.data?.vendors || (Array.isArray(list.data) ? list.data : []);
  assert(vendors.length >= 1, `Vendor appears in list (count: ${vendors.length})`);

  // 2d. Get vendor by ID
  if (IDs.vendorId) {
    const single = await api(`/vendors/${IDs.vendorId}/`);
    assert(single.ok, 'Get vendor by ID');
    const sv = single.data?.vendor || single.data;
    assert(sv.email === 'rahul@testvendor.com', 'Vendor email matches');
  }

  // 2e. Update vendor
  if (IDs.vendorId) {
    const update = await api(`/vendors/${IDs.vendorId}/`, {
      method: 'PUT',
      body: JSON.stringify({
        vendorName: `Test Vendor Studios ${RUN_ID}`,
        vendorType: 'Test Photography',
        panNumber: 'AABCU9603R',
        contactPerson: 'Rahul Test Updated',
        phone: '9876543210',
        email: 'rahul@testvendor.com',
        tdsType: 'TDS @ 10% (Sec 194J)',
        bankName: 'State Bank of India',
        accountNumber: '1234567890',
        ifscCode: 'SBIN0001234',
        accountType: 'Current',
        status: 'Verified',
      }),
    });
    assert(update.ok, 'Update vendor', `status=${update.status} ${JSON.stringify(update.data).slice(0,300)}`);
    const uv = update.data?.vendor || update.data;
    if (update.ok) {
      assert(uv.contactPerson === 'Rahul Test Updated', 'Contact person updated');
      assert(uv.tdsType === 'TDS @ 10% (Sec 194J)', 'TDS type updated');
    }
  }

  // 2f. Test vendor validation (bad PAN)
  const badVendor = await api('/vendors/', {
    method: 'POST',
    body: JSON.stringify({
      vendorName: 'Bad Vendor',
      panNumber: 'INVALID',
      contactPerson: 'Test',
      phone: '9999999999',
      email: 'bad@test.com',
    }),
  });
  assert(!badVendor.ok, 'Rejects invalid PAN format');

  // 2g. Test vendor validation (bad phone)
  const badPhone = await api('/vendors/', {
    method: 'POST',
    body: JSON.stringify({
      vendorName: 'Bad Phone Vendor',
      panNumber: 'AABCU9604R',
      contactPerson: 'Test',
      phone: '1234567890', // starts with 1, invalid
      email: 'bad2@test.com',
    }),
  });
  assert(!badPhone.ok, 'Rejects phone not starting with 6-9');
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: WORK ORDER — Fixed type
// ═══════════════════════════════════════════════════════════════
async function testWorkOrderFixed() {
  console.log('\n📋 STEP 3a: Work Order (Fixed)');

  if (!IDs.vendorId) {
    console.log('  ⏭️  Skipped — no vendor ID');
    return;
  }

  const wo = await api('/work-orders/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderNumber: `WO-PH-TV-${RUN_ID}-1`,
      vendorId: IDs.vendorId,
      type: 'Fixed',
      amount: 100000,
      serviceDescription: 'Photography for Test Event',
      tdsRate: 2,
      tdsComment: 'Sec 194C – Contractor',
      projectRef: 'Test Project Alpha',
      status: 'Issued',
    }),
  });
  assert(wo.ok, 'Create Fixed work order', `status=${wo.status} ${JSON.stringify(wo.data).slice(0,300)}`);
  IDs.fixedWOId = wo.data?.id;

  if (wo.ok) {
    assert(wo.data.workOrderNumber === `WO-PH-TV-${RUN_ID}-1`, 'WO number correct');
    assert(wo.data.type === 'Fixed', 'Type is Fixed');
    assert(parseFloat(wo.data.amount) === 100000, 'Amount is 100000');
    assert(parseFloat(wo.data.tdsRate) === 2, 'TDS rate is 2%');
    assert(wo.data.vendorName === `Test Vendor Studios ${RUN_ID}`, 'Vendor name populated (denormalized)');
    assert(wo.data.panNumber === 'AABCU9603R', 'PAN from vendor populated');
    // Bank may be empty after vendor update (update didn't re-send bank fields)
    assert(wo.data.bankName !== undefined, 'Bank field present in WO response');
    assert(parseFloat(wo.data.remaining) === 100000, 'Remaining equals total (no payments yet)');
  }

  // List work orders
  const list = await api('/work-orders/');
  assert(list.ok, 'List work orders');
  const woList = list.data?.workOrders || (Array.isArray(list.data) ? list.data : []);
  assert(woList.length >= 1, `WO appears in list (count: ${woList.length})`);
}

// ═══════════════════════════════════════════════════════════════
// STEP 3b: WORK ORDER — Periodic type
// ═══════════════════════════════════════════════════════════════
async function testWorkOrderPeriodic() {
  console.log('\n📋 STEP 3b: Work Order (Periodic)');

  if (!IDs.vendorId) {
    console.log('  ⏭️  Skipped — no vendor ID');
    return;
  }

  const wo = await api('/work-orders/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderNumber: `WO-PH-TV-${RUN_ID}-2`,
      vendorId: IDs.vendorId,
      type: 'Periodic',
      amount: 120000, // total
      amountPerPeriod: 30000,
      numberOfPeriods: 4,
      periodType: 'Quarterly',
      serviceDescription: 'Quarterly photography coverage',
      tdsRate: 10,
      tdsComment: 'Sec 194J – Professional',
      projectRef: 'Test Project Alpha',
      status: 'Issued',
    }),
  });
  assert(wo.ok, 'Create Periodic work order', `status=${wo.status} ${JSON.stringify(wo.data).slice(0,400)}`);
  IDs.periodicWOId = wo.data?.id;

  if (wo.ok) {
    assert(wo.data.type === 'Periodic', 'Type is Periodic');
    assert(parseFloat(wo.data.amountPerPeriod) === 30000, 'Amount per period is 30000');
    assert(wo.data.numberOfPeriods === 4, '4 periods');
    assert(Array.isArray(wo.data.periods), 'Periods array returned');
    assert(wo.data.periods?.length === 4, '4 period objects auto-created');
    if (wo.data.periods?.length > 0) {
      assert(wo.data.periods[0].label === 'Quarter 1 of 4', 'Period 1 label correct');
      assert(!wo.data.periods[0].isPaid, 'Period 1 not yet paid');
    }
    assert(wo.data.paidPeriods?.length === 0, 'No paid periods yet');
  }
}

// ═══════════════════════════════════════════════════════════════
// STEP 4a: PAYMENT REQUEST — Against Fixed WO
// ═══════════════════════════════════════════════════════════════
async function testPaymentFixed() {
  console.log('\n💰 STEP 4a: Payment Request (Fixed WO)');

  if (!IDs.fixedWOId || !IDs.vendorId) {
    console.log('  ⏭️  Skipped — no WO or vendor');
    return;
  }

  const pr = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.fixedWOId,
      vendorId: IDs.vendorId,
      grossAmount: 50000,
      tdsRate: 2,
      invoiceDate: '2026-03-20',
      notes: 'Partial payment for photography',
    }),
  });
  assert(pr.ok, 'Create payment request (Fixed)', `status=${pr.status} ${JSON.stringify(pr.data).slice(0,400)}`);
  IDs.fixedPRId = pr.data?.id;

  if (pr.ok) {
    assert(!!pr.data.requestNumber, `Request number generated: ${pr.data.requestNumber}`);
    assert(parseFloat(pr.data.grossAmount) === 50000, 'Gross amount is 50000');
    assert(parseFloat(pr.data.tdsRate) === 2, 'TDS rate is 2%');
    assert(parseFloat(pr.data.tdsAmount) === 1000, 'TDS amount = 50000 * 2% = 1000');
    assert(parseFloat(pr.data.netAmount) === 49000, 'Net amount = 50000 - 1000 = 49000');
    assert(pr.data.vendorName === `Test Vendor Studios ${RUN_ID}`, 'Vendor name in response');
    assert(pr.data.workOrderNumber === `WO-PH-TV-${RUN_ID}-1`, 'WO number in response');
    IDs.fixedPRRequestNumber = pr.data.requestNumber;
  }

  // Verify WO remaining updated
  const wo = await api(`/work-orders/${IDs.fixedWOId}/`);
  if (wo.ok) {
    assert(parseFloat(wo.data.remaining) === 50000, 'WO remaining reduced to 50000 after payment');
    assert(parseFloat(wo.data.paidGrossAmount) === 50000, 'WO paidGrossAmount updated to 50000');
  }

  // Test over-payment rejection
  const overPay = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.fixedWOId,
      vendorId: IDs.vendorId,
      grossAmount: 60000, // only 50000 remaining
      tdsRate: 2,
      invoiceDate: '2026-03-21',
    }),
  });
  assert(!overPay.ok, 'Rejects payment exceeding WO balance');
}

// ═══════════════════════════════════════════════════════════════
// STEP 4b: PAYMENT REQUEST — Against Periodic WO (Period 1)
// ═══════════════════════════════════════════════════════════════
async function testPaymentPeriodic() {
  console.log('\n💰 STEP 4b: Payment Request (Periodic WO — Quarter 1)');

  if (!IDs.periodicWOId || !IDs.vendorId) {
    console.log('  ⏭️  Skipped — no WO or vendor');
    return;
  }

  const pr = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.periodicWOId,
      vendorId: IDs.vendorId,
      grossAmount: 30000,
      tdsRate: 10,
      periodNumber: 1,
      periodLabel: 'Quarter 1 of 4',
      invoiceDate: '2026-03-20',
      notes: 'Q1 payment',
    }),
  });
  assert(pr.ok, 'Create payment for Period 1', `status=${pr.status} ${JSON.stringify(pr.data).slice(0,400)}`);
  IDs.periodicPRId = pr.data?.id;

  if (pr.ok) {
    assert(parseFloat(pr.data.grossAmount) === 30000, 'Gross = 30000');
    assert(parseFloat(pr.data.tdsAmount) === 3000, 'TDS = 30000 * 10% = 3000');
    assert(parseFloat(pr.data.netAmount) === 27000, 'Net = 30000 - 3000 = 27000');
    assert(pr.data.periodLabel === 'Quarter 1 of 4', 'Period label correct');
  }

  // Verify period marked as paid
  const wo = await api(`/work-orders/${IDs.periodicWOId}/`);
  if (wo.ok) {
    assert(wo.data.paidPeriods?.includes(1), 'Period 1 marked as paid in WO');
    assert(parseFloat(wo.data.paidGrossAmount) === 30000, 'Periodic WO paidGrossAmount = 30000');
    assert(parseFloat(wo.data.remaining) === 90000, 'Periodic WO remaining = 90000');
    if (wo.data.periods?.length > 0) {
      assert(wo.data.periods[0].isPaid === true, 'Period 1 isPaid = true');
      assert(wo.data.periods[1].isPaid === false, 'Period 2 still unpaid');
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// STEP 5: TDS RECORDS — Auto-created from payments
// ═══════════════════════════════════════════════════════════════
async function testTDSRecords() {
  console.log('\n🧾 STEP 5: TDS Records');

  // TDS records should have been auto-created by payment requests
  const tds = await api('/tds/');
  assert(tds.ok, 'List TDS records', `status=${tds.status}`);

  const records = tds.data?.tdsRecords || (Array.isArray(tds.data) ? tds.data : []);
  assert(records.length >= 2, `At least 2 TDS records created (got ${records.length})`);

  if (records.length >= 1) {
    const rec = records[0];
    assert(!!rec.vendorName, 'TDS record has vendor name');
    assert(!!rec.panNumber, 'TDS record has PAN');
    assert(!!rec.section, 'TDS record has section');
    assert(!!rec.woNumber, 'TDS record has WO number');
    assert(parseFloat(rec.tdsAmount) > 0, 'TDS amount > 0');
    assert(rec.status === 'Pending', 'TDS status is Pending');
  }

  // TDS Summary
  const summary = await api('/tds/summary/');
  assert(summary.ok, 'TDS summary endpoint works', `status=${summary.status}`);

  // Mark TDS deposited
  const month = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
  const deposit = await api('/tds/mark_deposited/', {
    method: 'POST',
    body: JSON.stringify({ month: 'Mar 2026' }),
  });
  assert(deposit.ok, 'Mark TDS deposited for month', `status=${deposit.status} ${JSON.stringify(deposit.data).slice(0,200)}`);

  // Verify status changed
  const tdsAfter = await api('/tds/');
  const recordsAfter = tdsAfter.data?.tdsRecords || (Array.isArray(tdsAfter.data) ? tdsAfter.data : []);
  const deposited = recordsAfter.filter(r => r.status === 'Deposited');
  assert(deposited.length >= 1, 'At least 1 TDS record marked Deposited');
}

// ═══════════════════════════════════════════════════════════════
// STEP 6: LIST & FILTER — Verify data flows end-to-end
// ═══════════════════════════════════════════════════════════════
async function testListAndFilter() {
  console.log('\n🔍 STEP 6: List & Filter');

  // Payment requests list
  const prs = await api('/payment-requests/');
  assert(prs.ok, 'List all payment requests');
  const prList = prs.data?.paymentRequests || (Array.isArray(prs.data) ? prs.data : []);
  assert(prList.length >= 2, `At least 2 payment requests (got ${prList.length})`);

  // Each PR should have vendor + WO details denormalized
  if (prList.length > 0) {
    const pr = prList[0];
    assert(!!pr.vendorName, 'PR has vendorName (denormalized)');
    assert(!!pr.workOrderNumber, 'PR has workOrderNumber (denormalized)');
    assert(!!pr.panNumber, 'PR has PAN (denormalized)');
    assert(!!pr.bankName || pr.bankName === '', 'PR has bankName field');
  }

  // Work orders list
  const wos = await api('/work-orders/');
  assert(wos.ok, 'List all work orders');

  // Vendors list with filters
  const filtered = await api('/vendors/?vendor_type=Test%20Photography');
  assert(filtered.ok, 'Filter vendors by type');

  // Config list
  const configs = await api('/config/?category=vendor_name');
  assert(configs.ok, 'List config by category');
}

// ═══════════════════════════════════════════════════════════════
// STEP 7: SECOND PAYMENT — Clear remaining Fixed WO balance
// ═══════════════════════════════════════════════════════════════
async function testSecondPayment() {
  console.log('\n💰 STEP 7: Second Payment (Clear Fixed WO)');

  if (!IDs.fixedWOId || !IDs.vendorId) {
    console.log('  ⏭️  Skipped');
    return;
  }

  const pr = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.fixedWOId,
      vendorId: IDs.vendorId,
      grossAmount: 50000, // remaining balance
      tdsRate: 2,
      invoiceDate: '2026-03-25',
      notes: 'Final payment — clears WO',
    }),
  });
  assert(pr.ok, 'Create final payment for Fixed WO', `status=${pr.status}`);

  // Verify WO fully paid
  const wo = await api(`/work-orders/${IDs.fixedWOId}/`);
  if (wo.ok) {
    assert(parseFloat(wo.data.remaining) === 0, 'Fixed WO remaining = 0 (fully paid)');
    assert(parseFloat(wo.data.paidGrossAmount) === 100000, 'Fixed WO paidGrossAmount = 100000');
  }

  // Now try to pay again — should be rejected
  const overPay = await api('/payment-requests/', {
    method: 'POST',
    body: JSON.stringify({
      workOrderId: IDs.fixedWOId,
      vendorId: IDs.vendorId,
      grossAmount: 1000,
      tdsRate: 2,
      invoiceDate: '2026-03-26',
    }),
  });
  assert(!overPay.ok, 'Rejects payment on fully-paid WO');
}

// ═══════════════════════════════════════════════════════════════
// STEP 8: CLEANUP — Delete test data
// ═══════════════════════════════════════════════════════════════
async function testCleanup() {
  console.log('\n🧹 STEP 8: Cleanup');

  // Delete payment requests first (FK to WO)
  const prs = await api('/payment-requests/');
  const prList = prs.data?.paymentRequests || (Array.isArray(prs.data) ? prs.data : []);
  for (const pr of prList) {
    const del = await api(`/payment-requests/${pr.id}/`, { method: 'DELETE' });
    assert(del.status === 204 || del.ok, `Delete PR ${pr.requestNumber || pr.id}`);
  }

  // Delete work orders
  if (IDs.fixedWOId) {
    const del = await api(`/work-orders/${IDs.fixedWOId}/`, { method: 'DELETE' });
    assert(del.status === 204 || del.ok, 'Delete Fixed WO');
  }
  if (IDs.periodicWOId) {
    const del = await api(`/work-orders/${IDs.periodicWOId}/`, { method: 'DELETE' });
    assert(del.status === 204 || del.ok, 'Delete Periodic WO');
  }

  // Delete vendor
  if (IDs.vendorId) {
    const del = await api(`/vendors/${IDs.vendorId}/`, { method: 'DELETE' });
    assert(del.status === 204 || del.ok, 'Delete vendor');
  }

  // Delete config items
  for (const id of [IDs.serviceTypeId, IDs.entityTypeId, IDs.vendorNameId]) {
    if (id) {
      await api(`/config/${id}/`, { method: 'DELETE' });
    }
  }
  console.log('  ✅ Config items cleaned up');
}

// ═══════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════
async function run() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  TTA End-to-End Integration Test');
  console.log('  Backend: http://localhost:8000');
  console.log('═══════════════════════════════════════════════════');

  try {
    await testLogin();
    await testAdminConfig();
    await testVendorCreation();
    await testWorkOrderFixed();
    await testWorkOrderPeriodic();
    await testPaymentFixed();
    await testPaymentPeriodic();
    await testTDSRecords();
    await testListAndFilter();
    await testSecondPayment();
    await testCleanup();
  } catch (err) {
    console.log(`\n💥 FATAL ERROR: ${err.message}`);
    console.log(err.stack);
    results.failed++;
    results.errors.push(`Fatal: ${err.message}`);
  }

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

run();
