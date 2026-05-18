# Further Backend Plan — TTA

## Current State (as of 2026-03-20)

### What EXISTS in backend (Django 3.2 / MariaDB 10.1)
| App | Models | Status |
|-----|--------|--------|
| accounts | User (email-based, roles: SUPER_ADMIN, ADMIN, REP) | Deployed, working |
| trials | Trial, TrialCity | Deployed, working |
| reps | REP (M2M → Trial) | Deployed, working |
| trialcities | TrialCityLocation (global master list) | Deployed, working |
| vendors | Vendor (bank details, PAN, TDS type) | Deployed, working |

### What's MISSING in backend
| Module | Frontend Status | Backend Status |
|--------|----------------|----------------|
| Work Orders | Full UI with fake data (localStorage) | **No app, no models** |
| Payments | Full UI with fake data (FAKE_PAYMENT_REQUESTS) | **No app, no models** |
| Bank/TDS | Full UI with fake data | **No app, no models** |
| Admin Config | localStorage via adminStorage.js | **No app, no models** |

### Server Details
- Server: `tta.indiakhelofootball.com` at `/root/TTA/backend`
- DB: MariaDB 10.1.48 (very old — no JSON fields, no generated columns)
- Python 3.13, Django 3.2
- Venv: `/root/TTA/backend/venv/bin/python`

---

## PHASE 1: Admin Config Backend

### Why first
All dropdown options (Service Types, Entity Types, Seasons, Project Names, Vendor Names) live in localStorage. Other modules depend on these. Backend-ifying this first gives a shared source of truth.

### Task 1.1: Create `config` app
```
python manage.py startapp config
```

### Task 1.2: ConfigOption model
```python
class ConfigOption(models.Model):
    CATEGORY_CHOICES = [
        ('service_type', 'Service Type'),
        ('entity_type', 'Entity Type'),
        ('season', 'Season'),
        ('project_name', 'Project Name'),
        ('vendor_name', 'Vendor Name'),
    ]
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    value = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('category', 'value')
        ordering = ['category', 'value']
```

### Task 1.3: Serializer, ViewSet, URLs
- `GET /api/config/?category=service_type` → list by category
- `POST /api/config/` → create new option
- `DELETE /api/config/{id}/` → soft-delete (is_active=False)
- Bulk endpoint: `POST /api/config/bulk/` → seed multiple options at once

### Task 1.4: Frontend migration
- Replace `adminStorage.js` localStorage calls with API calls
- Fallback to localStorage if API unreachable

---

## PHASE 2: Work Order Backend

### Why second
Payment requests reference work orders. Need WO in DB before payments can reference them.

### Task 2.1: Create `workorders` app
```
python manage.py startapp workorders
```

### Task 2.2: WorkOrder model
```python
class WorkOrder(models.Model):
    TYPE_CHOICES = [('Fixed', 'Fixed'), ('Periodic', 'Periodic')]
    PERIOD_TYPE_CHOICES = [
        ('Monthly', 'Monthly'), ('Quarterly', 'Quarterly'),
        ('Half-Yearly', 'Half-Yearly'), ('Yearly', 'Yearly'),
    ]

    work_order_number = models.CharField(max_length=50, unique=True)
    vendor = models.ForeignKey('vendors.Vendor', on_delete=models.PROTECT, related_name='work_orders')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    project_ref = models.CharField(max_length=255, blank=True, default='')
    service_description = models.TextField(blank=True, default='')
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # total WO value
    tds_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Periodic-specific
    period_type = models.CharField(max_length=20, choices=PERIOD_TYPE_CHOICES, blank=True, default='')
    number_of_periods = models.PositiveIntegerField(default=1)
    amount_per_period = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Tracking
    paid_gross_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vendor']),
            models.Index(fields=['type']),
        ]
```

### Task 2.3: WorkOrderPeriod model (for Periodic WOs)
```python
class WorkOrderPeriod(models.Model):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='periods')
    period_number = models.PositiveIntegerField()
    label = models.CharField(max_length=100)  # e.g. "Quarter 1 of 4"
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_paid = models.BooleanField(default=False)

    class Meta:
        unique_together = ('work_order', 'period_number')
        ordering = ['period_number']
```

### Task 2.4: Serializer
- camelCase mapping: `workOrderNumber`, `projectRef`, `serviceDescription`, `tdsRate`, `periodType`, `numberOfPeriods`, `amountPerPeriod`, `paidGrossAmount`
- Nested read: `vendor` details (name, PAN, bank info) — read-only
- Nested read: `periods` list — read-only
- Write: `vendorId` (FK)
- Computed: `remaining` = amount - paid_gross_amount

### Task 2.5: ViewSet & URLs
```
GET    /api/work-orders/                 — list (filter by vendor, type)
POST   /api/work-orders/                 — create
GET    /api/work-orders/{id}/            — retrieve (with vendor + periods)
PUT    /api/work-orders/{id}/            — update
DELETE /api/work-orders/{id}/            — delete
```

### Task 2.6: Frontend migration
- Replace `workOrderData.js` localStorage with API calls
- `WorkOrderManagementPage` → fetch from `/api/work-orders/`
- `WorkOrderModal` → POST/PUT to API
- Keep `loadWorkOrders()` as fallback during transition

---

## PHASE 3: Payment Request Backend

### Why third
Payments depend on Work Orders and Vendors — both must exist in DB first.

### Task 3.1: Create `payments` app
```
python manage.py startapp payments
```

### Task 3.2: PaymentRequest model
```python
class PaymentRequest(models.Model):
    request_number = models.CharField(max_length=50, unique=True)  # PR-2026-001
    work_order = models.ForeignKey('workorders.WorkOrder', on_delete=models.PROTECT, related_name='payment_requests')
    vendor = models.ForeignKey('vendors.Vendor', on_delete=models.PROTECT, related_name='payment_requests')

    # Amounts
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    tds_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tds_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Period (if Periodic WO)
    period_number = models.PositiveIntegerField(null=True, blank=True)
    period_label = models.CharField(max_length=100, blank=True, default='')

    invoice_date = models.DateField()
    notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vendor']),
            models.Index(fields=['work_order']),
        ]
```

**Note:** No status field — once a payment request is created, it's confirmed. The BLKPAY Excel export is the mechanism for bank processing.

### Task 3.3: Serializer
- camelCase mapping: `requestNumber`, `workOrderNumber` (from WO FK), `grossAmount`, `tdsRate`, `tdsAmount`, `netAmount`, `periodNumber`, `periodLabel`, `invoiceDate`
- Nested read: vendor details (name, type, PAN, bank info)
- Nested read: work order details (number, type, project ref)
- Write: `workOrderId`, `vendorId`
- Auto-compute: `tds_amount = gross_amount * tds_rate / 100`, `net_amount = gross_amount - tds_amount`
- On create: update `WorkOrder.paid_gross_amount += gross_amount`
- On create (Periodic): mark `WorkOrderPeriod.is_paid = True`

### Task 3.4: ViewSet & URLs
```
GET    /api/payment-requests/            — list (filter by vendor, work_order)
POST   /api/payment-requests/            — create (validates amount <= WO remaining)
GET    /api/payment-requests/{id}/       — retrieve
PUT    /api/payment-requests/{id}/       — update
DELETE /api/payment-requests/{id}/       — delete (reverses WO paid amount)
```

### Task 3.5: Move to Pay endpoint
```
POST   /api/payment-requests/export/     — returns BLKPAY Excel as file download
```
- Takes optional `ids` list in body (specific PRs) or exports all
- Generates IDFC FIRST Bank format Excel server-side
- Returns as `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### Task 3.6: Frontend migration
- Replace `FAKE_PAYMENT_REQUESTS` with API calls
- `PaymentManagementPage` → fetch from `/api/payment-requests/`
- `PaymentRequestModal` → POST to API
- "Move to Pay" → can stay client-side Excel gen (already works) OR call export endpoint

---

## PHASE 4: TDS Tracking Backend

### Task 4.1: TDS model (in payments app)
```python
class TDSRecord(models.Model):
    STATUS_CHOICES = [('Pending', 'Pending'), ('Deposited', 'Deposited')]

    payment_request = models.OneToOneField(PaymentRequest, on_delete=models.CASCADE, related_name='tds_record')
    vendor = models.ForeignKey('vendors.Vendor', on_delete=models.PROTECT)
    section = models.CharField(max_length=100)  # e.g. "194C – Contractor (Individual)"
    rate = models.CharField(max_length=10)       # e.g. "1%"
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    tds_amount = models.DecimalField(max_digits=12, decimal_places=2)
    month = models.CharField(max_length=20)      # e.g. "Jan 2026"
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    deposited_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
```

- Auto-created when PaymentRequest is created (if tds_amount > 0)
- Section derived from vendor's `tds_type` field

### Task 4.2: TDS endpoints
```
GET    /api/tds/                         — list (filter by status, month)
GET    /api/tds/summary/                 — grouped by section (for TDS summary table)
POST   /api/tds/mark-deposited/          — bulk mark as deposited by month
GET    /api/tds/export/                  — CSV download
```

### Task 4.3: Frontend migration
- Replace `FAKE_TDS_RECORDS` and `FAKE_TDS_SUMMARY` with API calls
- BankManagementPage TDS tab → fetch from `/api/tds/`

---

## PHASE 5: Connect Frontend to Backend APIs

### Task 5.1: Update `api.js`
Add new API service objects:
```javascript
export const configAPI = { ... }
export const workOrdersAPI = { ... }
export const paymentRequestsAPI = { ... }
export const tdsAPI = { ... }
```

### Task 5.2: Remove all fake data
- Delete `FAKE_PAYMENT_REQUESTS`, `FAKE_TDS_RECORDS`, `FAKE_TDS_SUMMARY` from `paymentData.js`
- Delete `SEED_WORK_ORDERS` from `workOrderData.js`
- Remove localStorage work order persistence
- Remove `FALLBACK_VENDORS` from pages

### Task 5.3: Error handling
- Add loading states to all pages
- Add empty states when no data
- Add error toasts for API failures

---

## PHASE 6: Deployment

### Task 6.1: Server setup for new apps
```bash
# On server
cd /root/TTA/backend/ikf-tta-backend
git pull origin main
cd backend

# Register new apps in settings.py (already done in code)
/root/TTA/backend/venv/bin/python manage.py makemigrations config workorders payments
/root/TTA/backend/venv/bin/python manage.py migrate
sudo systemctl restart tta
```

### Task 6.2: Data seeding
- Seed ConfigOption with current admin localStorage values
- No WO/Payment seed needed (start fresh)

### Task 6.3: Frontend deploy
```bash
npm run build
# Run deploy.bat
```

---

## Execution Order Summary

```
Phase 1: Config app         → admin dropdowns in DB
Phase 2: Work Orders app    → WO CRUD with vendor FK
Phase 3: Payments app       → PR CRUD with WO + vendor FK, auto TDS calc
Phase 4: TDS tracking       → TDS records, deposit tracking
Phase 5: Frontend migration → replace fake data with API calls
Phase 6: Deploy             → migrate, seed, restart
```

Each phase is independently deployable. Phase 2-4 can be built in parallel on backend, Phase 5 connects them all.

---

## MariaDB 10.1 Constraints (IMPORTANT)
- No `JSONField` — use related models or TextField for structured data
- No `GeneratedField` — compute in Python/serializer
- No `DEFAULT` expressions on text columns — use `blank=True, default=''`
- `DecimalField` preferred over `FloatField` for money
- `BigAutoField` works fine
- Django 3.2 is the max version supported
