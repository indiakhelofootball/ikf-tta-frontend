# Trial Management - Backend API Specification

## Database Schema

### `trials` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID / SERIAL | PRIMARY KEY | Unique trial identifier |
| trial_name | VARCHAR(255) | UNIQUE, NOT NULL | Human-readable trial name |
| trial_code | VARCHAR(50) | UNIQUE, NOT NULL | Auto-generated code (TRL-S6-REG-001) |
| season | VARCHAR(50) | NOT NULL | Season identifier (Season 1-10, Custom) |
| trial_type | VARCHAR(50) | NOT NULL | Regular, CSR, Championship, School Partnership |
| tier_type | VARCHAR(50) | NOT NULL, DEFAULT 'Not Any' | Not Any, Basic, Standard, Premium |
| tier_details | TEXT | NULLABLE | Tier package description |
| tier_amount | DECIMAL(10,2) | NULLABLE | Tier pricing amount in INR |
| expected_participants | INTEGER | NULLABLE | Expected participant count |
| schedule_type | VARCHAR(20) | NOT NULL | Fixed or Tentative |
| start_date | DATE | NULLABLE | Fixed schedule start date |
| end_date | DATE | NULLABLE | Fixed schedule end date |
| tentative_month | VARCHAR(20) | NULLABLE | Tentative month name |
| tentative_date_range | VARCHAR(100) | NULLABLE | Human-readable tentative range |
| next_trial_date | DATE | NULLABLE | Next trial date (for tentative) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'Draft' | Active, Draft, Completed, Cancelled |
| comment | TEXT | NULLABLE | Additional notes |
| created_by | VARCHAR(255) | NOT NULL | Creator username/ID |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

### `trial_cities` Junction Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID / SERIAL | PRIMARY KEY | Row identifier |
| trial_id | UUID / INTEGER | FK -> trials.id, NOT NULL | Reference to trial |
| city_code | VARCHAR(50) | NOT NULL | Trial city code (e.g., IKF-MH-MUM-001) |
| assigned_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | When city was assigned |
| assigned_by | VARCHAR(255) | NOT NULL | Who assigned the city |

**Unique constraint:** `(trial_id, city_code)` - a city can only be assigned once per trial.

### Indexes

```sql
CREATE INDEX idx_trials_status ON trials(status);
CREATE INDEX idx_trials_season ON trials(season);
CREATE INDEX idx_trials_type ON trials(trial_type);
CREATE INDEX idx_trials_start_date ON trials(start_date);
CREATE INDEX idx_trial_cities_trial ON trial_cities(trial_id);
CREATE INDEX idx_trial_cities_city ON trial_cities(city_code);
```

---

## REST API Endpoints

### 1. List Trials

```
GET /api/trials
```

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| search | string | Search across name, code, season, type, comment, cities |
| status | string | Filter by status (Active, Draft, Completed, Cancelled) |
| trial_type | string | Filter by trial type |
| season | string | Filter by season |
| date_filter | string | this-month, next-month, this-quarter, tentative-only |
| sort | string | latest, oldest, name-asc, name-desc, upcoming, past |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response: 200 OK**
```json
{
  "trials": [...],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

### 2. Get Trial by ID

```
GET /api/trials/:id
```

**Response: 200 OK**
```json
{
  "trial": {
    "id": "...",
    "trialName": "...",
    "trialCode": "...",
    "assignedCities": ["IKF-MH-MUM-001", ...],
    ...
  }
}
```

**Error: 404 Not Found**

### 3. Create Trial

```
POST /api/trials
```

**Request Body:**
```json
{
  "trialName": "Nari Shakti Season 6",
  "season": "Season 6",
  "trialType": "Regular",
  "tierType": "Standard",
  "tierDetails": "Standard package",
  "tierAmount": 25000,
  "expectedParticipants": 200,
  "scheduleType": "Fixed",
  "startDate": "2024-03-15",
  "endDate": "2024-03-20",
  "comment": "...",
  "status": "Draft"
}
```

**Response: 201 Created**
```json
{
  "trial": { ... },
  "message": "Trial created successfully"
}
```

**Errors:**
- `400` - Validation errors
- `409` - Trial name already exists

### 4. Update Trial

```
PUT /api/trials/:id
```

**Request Body:** (partial update, `trialName` and `trialCode` cannot be changed)
```json
{
  "season": "Season 6",
  "trialType": "Regular",
  "tierType": "Not Any",
  "status": "Active",
  ...
}
```

**Response: 200 OK**

**Errors:**
- `400` - Validation errors
- `404` - Trial not found

### 5. Delete Trial

```
DELETE /api/trials/:id
```

**Response: 200 OK**
```json
{
  "message": "Trial deleted successfully",
  "trial": { ... }
}
```

**Business Logic:** On delete, all entries in `trial_cities` for this trial are also removed (cascade delete).

**Errors:**
- `404` - Trial not found

### 6. Check Name Exists

```
GET /api/trials/check-name?name=Nari+Shakti+Season+6
```

**Response: 200 OK**
```json
{
  "exists": true
}
```

### 7. Assign City to Trial

```
POST /api/trials/:id/cities
```

**Request Body:**
```json
{
  "cityCode": "IKF-MH-MUM-001"
}
```

**Response: 200 OK**

**Errors:**
- `404` - Trial not found
- `409` - City already assigned

### 8. Remove City from Trial

```
DELETE /api/trials/:id/cities/:cityCode
```

**Response: 200 OK**

**Errors:**
- `404` - Trial or city assignment not found

---

## Validation Rules

| Field | Rule |
|-------|------|
| trialName | Required, unique (case-insensitive), max 255 chars |
| trialCode | Auto-generated, format: TRL-{SeasonCode}-{TypeCode}-{Number} |
| season | Required, must be one of: Season 1-10, Custom |
| trialType | Required, must be one of: Regular, CSR, Championship, School Partnership |
| tierType | Required, must be one of: Not Any, Basic, Standard, Premium |
| tierDetails | Required if tierType != 'Not Any' |
| tierAmount | Required if tierType != 'Not Any', must be positive number |
| scheduleType | Required, must be: Fixed or Tentative |
| startDate | Required if scheduleType == 'Fixed' |
| endDate | Required if scheduleType == 'Fixed', must be after startDate |
| tentativeMonth | Required if scheduleType == 'Tentative' |
| status | Required, must be one of: Active, Draft, Completed, Cancelled |

## Status Transitions

| From | Allowed To |
|------|-----------|
| Draft | Active, Cancelled |
| Active | Completed, Cancelled |
| Completed | (terminal state) |
| Cancelled | Draft (re-activate) |

## Business Logic

1. **Trial Code Generation:** Backend generates `TRL-S{n}-{TYPE}-{NNN}` format. Sequential numbering per season+type combination.
2. **Name Uniqueness:** Case-insensitive check before create. Name is immutable after creation.
3. **Cascade Delete:** Deleting a trial removes all `trial_cities` entries for that trial.
4. **City Assignment:** Validate that the city code exists in the trial_cities table before assignment.
5. **Tier Fields:** When `tierType` is 'Not Any', `tierDetails`, `tierAmount`, and `expectedParticipants` should be null.
6. **Schedule Fields:** When `scheduleType` is 'Fixed', tentative fields are null and vice versa.

---

## Django Model (Suggested)

```python
from django.db import models

class Trial(models.Model):
    SEASON_CHOICES = [(f'Season {i}', f'Season {i}') for i in range(1, 11)] + [('Custom', 'Custom')]
    TYPE_CHOICES = [
        ('Regular', 'Regular'),
        ('CSR', 'CSR'),
        ('Championship', 'Championship'),
        ('School Partnership', 'School Partnership'),
    ]
    TIER_CHOICES = [
        ('Not Any', 'Not Any'),
        ('Basic', 'Basic'),
        ('Standard', 'Standard'),
        ('Premium', 'Premium'),
    ]
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Draft', 'Draft'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]
    SCHEDULE_CHOICES = [
        ('Fixed', 'Fixed'),
        ('Tentative', 'Tentative'),
    ]

    trial_name = models.CharField(max_length=255, unique=True)
    trial_code = models.CharField(max_length=50, unique=True)
    season = models.CharField(max_length=50, choices=SEASON_CHOICES)
    trial_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    tier_type = models.CharField(max_length=50, choices=TIER_CHOICES, default='Not Any')
    tier_details = models.TextField(null=True, blank=True)
    tier_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expected_participants = models.IntegerField(null=True, blank=True)
    schedule_type = models.CharField(max_length=20, choices=SCHEDULE_CHOICES)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    tentative_month = models.CharField(max_length=20, null=True, blank=True)
    tentative_date_range = models.CharField(max_length=100, null=True, blank=True)
    next_trial_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    comment = models.TextField(null=True, blank=True)
    created_by = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.trial_name} ({self.trial_code})"


class TrialCity(models.Model):
    trial = models.ForeignKey(Trial, on_delete=models.CASCADE, related_name='assigned_cities')
    city_code = models.CharField(max_length=50)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.CharField(max_length=255)

    class Meta:
        unique_together = ('trial', 'city_code')

    def __str__(self):
        return f"{self.trial.trial_name} - {self.city_code}"
```
