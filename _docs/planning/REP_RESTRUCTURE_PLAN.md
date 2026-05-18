# REP Module Restructure Plan

## Problem Statement

A REP (Regional Event Partner) is an **organization** — a single entity like "RUFC" or "Lemon Brick". Currently, the system ties a REP to a specific city via `unique_together('rep_name', 'city')`. This forces creating duplicate REP records when the same organization operates in multiple cities.

**Example of the problem:**
- RUFC manages a project in Nicobar → REP record #1 created
- RUFC manages a project in Ambala → REP record #2 created (duplicate org details)
- Dashboard shows "4 Total REPs" when there are really 3 organizations

The city is not a property of the REP organization — it's a property of the **assignment** (which project, in which city, the REP handles).

---

## Core Concept

The relationship should mirror the Vendor → Work Order pattern:

```
Vendor (created once) → assigned to multiple Work Orders
REP    (created once) → assigned to multiple Projects (Trials) in different Cities
```

A **Project** = a **Trial** in backend language.
A **Trial City** = a city where that project takes place.
When a REP is assigned to a project, it means: **this REP will take care of this project in that city.**

```
RUFC (1 REP record — the organization)
  ├── Assignment: "Regular — Season 5" in Nicobar
  │     └── courier address, ground details for Nicobar
  └── Assignment: "Regular — Season 6" in Ambala
        └── courier address, ground details for Ambala
```

---

## Current Data Model

### REP Model (`reps/models.py`)

```python
class REP(models.Model):
    # --- ORG-LEVEL (should stay on REP) ---
    rep_name         = CharField(max_length=255)
    season           = CharField(max_length=50, blank=True)
    region           = CharField(max_length=50, choices=REGION_CHOICES, blank=True)

    # Contacts
    contact_name     = CharField(max_length=255)
    phone            = CharField(max_length=20)
    email            = EmailField()
    backup_contact_name  = CharField(blank=True)
    backup_phone         = CharField(blank=True)
    backup_email         = EmailField(blank=True)

    # Online Presence
    website, website_na, facebook, facebook_na,
    instagram, instagram_na, telegram, telegram_na

    # Legal
    mou_status, mou_document_name, mou_document_url
    rep_logo_name, rep_logo_url

    # --- CITY-SPECIFIC (should move to assignment) ---
    state            = CharField(max_length=100)          # WRONG LOCATION
    city             = CharField(max_length=100)           # WRONG LOCATION

    # Courier Address
    courier_accepting_name, courier_accepting_phone
    courier_address, courier_additional_info, courier_pin_code

    # Ground / Trial Location
    physical_address, ground_location, google_map_link
    pin_code, ground_pin_code, reporting_time
    ground_contact_name, ground_contact_phone

    # --- M2M (no city context) ---
    trials = ManyToManyField('trials.Trial', blank=True, related_name='reps')

    unique_together = ('rep_name', 'city')  # WRONG — ties org to city
```

### Trial & TrialCity Models

```python
class Trial(models.Model):
    trial_name    = CharField(unique=True)      # e.g. "Mumbai Regular"
    trial_code    = CharField(unique=True)       # e.g. "TRL-S5-REG-001"
    season        = CharField(choices=SEASON_CHOICES)
    trial_type    = CharField(choices=TYPE_CHOICES)
    # schedule, status, etc.

class TrialCity(models.Model):
    trial         = ForeignKey(Trial, related_name='cities')
    city_code     = CharField()
    state         = CharField()
    city_name     = CharField()
    region        = CharField()
    ground_location, tentative_month, tentative_date
    confirmed     = BooleanField()
    unique_together = ('trial', 'city_code')
```

---

## Target Data Model

### REP Model (Organization Only)

```python
class REP(models.Model):
    MOU_CHOICES = [('Signed','Signed'), ('Pending','Pending'), ('Not Required','Not Required')]

    # Identity
    rep_name = models.CharField(max_length=255, unique=True)  # unique per org
    season   = models.CharField(max_length=50, blank=True, default='')

    # Primary Contact
    contact_name = models.CharField(max_length=255)
    phone        = models.CharField(max_length=20)
    email        = models.EmailField()

    # Backup Contact
    backup_contact_name = models.CharField(max_length=255, blank=True, default='')
    backup_phone        = models.CharField(max_length=20, blank=True, default='')
    backup_email        = models.EmailField(blank=True, default='')

    # Online Presence
    website      = models.URLField(max_length=500, blank=True, default='')
    website_na   = models.BooleanField(default=False)
    facebook     = models.URLField(max_length=500, blank=True, default='')
    facebook_na  = models.BooleanField(default=False)
    instagram    = models.URLField(max_length=500, blank=True, default='')
    instagram_na = models.BooleanField(default=False)
    telegram     = models.CharField(max_length=500, blank=True, default='')
    telegram_na  = models.BooleanField(default=False)

    # Legal / Documents
    mou_status        = models.CharField(max_length=20, choices=MOU_CHOICES, default='Pending')
    mou_document_name = models.CharField(max_length=500, blank=True, default='')
    mou_document_url  = models.TextField(blank=True, default='')
    rep_logo_name     = models.CharField(max_length=500, blank=True, default='')
    rep_logo_url      = models.TextField(blank=True, default='')

    # Trial assignments (via through table)
    trials = models.ManyToManyField('trials.Trial', through='REPCityAssignment',
                                     blank=True, related_name='reps')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.rep_name
```

**What changed:**
- `city`, `state`, `region` — REMOVED (moved to assignment)
- All courier fields — REMOVED (moved to assignment)
- All ground/location fields — REMOVED (moved to assignment)
- `unique_together('rep_name', 'city')` → `unique=True` on `rep_name`
- `trials` M2M now uses `through='REPCityAssignment'`
- `status` field already removed in prior change

### REPCityAssignment Model (New Through Table)

```python
class REPCityAssignment(models.Model):
    REGION_CHOICES = [
        ('North','North'), ('South','South'), ('East','East'),
        ('West','West'), ('Central','Central'),
    ]

    rep   = models.ForeignKey(REP, on_delete=models.CASCADE, related_name='city_assignments')
    trial = models.ForeignKey('trials.Trial', on_delete=models.CASCADE, related_name='rep_assignments')

    # City Identity
    state  = models.CharField(max_length=100)
    city   = models.CharField(max_length=100)
    region = models.CharField(max_length=50, choices=REGION_CHOICES, blank=True, default='')

    # Courier Address (city-specific)
    courier_accepting_name  = models.CharField(max_length=255, blank=True, default='')
    courier_accepting_phone = models.CharField(max_length=20, blank=True, default='')
    courier_address         = models.TextField(blank=True, default='')
    courier_additional_info = models.TextField(blank=True, default='')
    courier_pin_code        = models.CharField(max_length=10, blank=True, default='')

    # Ground / Trial Location (city-specific)
    physical_address     = models.TextField(blank=True, default='')
    ground_location      = models.CharField(max_length=255, blank=True, default='')
    google_map_link      = models.URLField(max_length=500, blank=True, default='')
    pin_code             = models.CharField(max_length=10, blank=True, default='')
    ground_pin_code      = models.CharField(max_length=10, blank=True, default='')
    reporting_time       = models.CharField(max_length=20, blank=True, default='')
    ground_contact_name  = models.CharField(max_length=255, blank=True, default='')
    ground_contact_phone = models.CharField(max_length=20, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('rep', 'trial', 'city')
        indexes = [
            models.Index(fields=['city']),
            models.Index(fields=['state']),
        ]

    def __str__(self):
        return f"{self.rep.rep_name} → {self.trial.trial_name} ({self.city})"
```

**Constraint: `unique_together('rep', 'trial', 'city')`**
- Same REP + same trial + same city = blocked (no duplicates)
- Same REP + different trial + same city = allowed (handles same city across projects)
- Same REP + same trial + different city = allowed (handles multiple cities in one project)

---

## Field Mapping: Where Each Field Lives

| Field | Current Location | New Location | Why |
|-------|-----------------|--------------|-----|
| `rep_name` | REP | REP | Org identity |
| `season` | REP | REP | Org metadata |
| `contact_name`, `phone`, `email` | REP | REP | Org contact |
| `backup_contact_*` | REP | REP | Org contact |
| `website`, `facebook`, `instagram`, `telegram` | REP | REP | Org online presence |
| `mou_*`, `rep_logo_*` | REP | REP | Org legal |
| `state` | REP | **Assignment** | City-specific |
| `city` | REP | **Assignment** | City-specific |
| `region` | REP | **Assignment** | City-specific |
| `courier_*` (all 5 fields) | REP | **Assignment** | City-specific |
| `physical_address` | REP | **Assignment** | City-specific |
| `ground_location` | REP | **Assignment** | City-specific |
| `google_map_link` | REP | **Assignment** | City-specific |
| `pin_code` | REP | **Assignment** | City-specific |
| `ground_pin_code` | REP | **Assignment** | City-specific |
| `reporting_time` | REP | **Assignment** | City-specific |
| `ground_contact_*` | REP | **Assignment** | City-specific |

---

## Migration Strategy

Three sequential migrations. MariaDB 10.1.48 compatible (no DDL in transactions).

### Migration 0014: Create `REPCityAssignment` Table

Schema-only. Creates the new through table with all fields listed above.

### Migration 0015: Data Migration

`RunPython` migration with `atomic=False` (MariaDB 10.1 safety):

```python
def forwards(apps, schema_editor):
    REP = apps.get_model('reps', 'REP')
    REPCityAssignment = apps.get_model('reps', 'REPCityAssignment')

    # Group REPs by lowercase rep_name
    from collections import defaultdict
    groups = defaultdict(list)
    for rep in REP.objects.all().order_by('created_at'):
        groups[rep.rep_name.strip().lower()].append(rep)

    for name, rep_list in groups.items():
        canonical = rep_list[0]  # earliest created = canonical org record

        for rep in rep_list:
            # Get trial IDs from old M2M
            trial_ids = list(rep.trials.values_list('id', flat=True))

            if trial_ids:
                for trial_id in trial_ids:
                    REPCityAssignment.objects.get_or_create(
                        rep=canonical,
                        trial_id=trial_id,
                        city=rep.city,
                        defaults={
                            'state': rep.state,
                            'region': rep.region,
                            'courier_accepting_name': rep.courier_accepting_name,
                            'courier_accepting_phone': rep.courier_accepting_phone,
                            'courier_address': rep.courier_address,
                            'courier_additional_info': rep.courier_additional_info,
                            'courier_pin_code': rep.courier_pin_code,
                            'physical_address': rep.physical_address,
                            'ground_location': rep.ground_location,
                            'google_map_link': rep.google_map_link,
                            'pin_code': rep.pin_code,
                            'ground_pin_code': rep.ground_pin_code,
                            'reporting_time': rep.reporting_time,
                            'ground_contact_name': rep.ground_contact_name,
                            'ground_contact_phone': rep.ground_contact_phone,
                        }
                    )
            # else: REP with no trial — org record kept, no assignment created

        # If multiple records for same org, update canonical with best data
        if len(rep_list) > 1:
            # Merge: keep canonical's org fields (earliest created)
            # Delete duplicate records (their city data is now in assignments)
            for dup in rep_list[1:]:
                dup.trials.clear()  # clear old M2M before delete
                dup.delete()
```

**Edge cases handled:**
- REP with no trials assigned → org record kept, no assignment row (user must assign later)
- Duplicate org names (RUFC x2) → merged into one, city-specific data preserved in separate assignments
- Same trial assigned to both duplicates → `get_or_create` prevents duplicate assignments

### Migration 0016: Remove Old Fields from REP

Schema migration:
- Drop columns: `state`, `city`, `region`, all `courier_*`, `physical_address`, all `ground_*`, `google_map_link`, `pin_code`, `reporting_time`
- Drop old `unique_together('rep_name', 'city')`
- Add `unique=True` on `rep_name`
- Drop old M2M intermediary table (Django handles this when switching to `through`)

---

## Backend Changes

### Serializer (`reps/serializers.py`)

**New: `REPCityAssignmentSerializer`**

```python
class REPCityAssignmentSerializer(serializers.ModelSerializer):
    # camelCase aliases for all fields
    trialId    = IntegerField(source='trial_id')
    trialName  = SerializerMethodField()  # read-only
    trialType  = SerializerMethodField()  # read-only
    trialSeason = SerializerMethodField() # read-only
    # ... all courier/ground fields with camelCase aliases ...

    class Meta:
        model = REPCityAssignment
        fields = ['id', 'trialId', 'trialName', 'trialType', 'trialSeason',
                  'state', 'city', 'region',
                  'courierAcceptingName', 'courierAcceptingPhone',
                  'courierAddress', 'courierAdditionalInfo', 'courierPinCode',
                  'physicalAddress', 'groundLocation', 'googleMapLink',
                  'pinCode', 'groundPinCode', 'reportingTime',
                  'groundContactName', 'groundContactPhone',
                  'createdAt', 'updatedAt']
```

**Updated: `REPSerializer`**

```python
class REPSerializer(serializers.ModelSerializer):
    # Org-level fields only (no city/state/courier/ground)
    cityAssignments = REPCityAssignmentSerializer(
        source='city_assignments', many=True, read_only=True
    )
    numberOfCities = SerializerMethodField()
    numberOfTrials = SerializerMethodField()

    # Write-only for creating assignments inline
    cityAssignment = REPCityAssignmentSerializer(write_only=True, required=False)
    trialIds = ListField(child=IntegerField(), write_only=True, required=False, default=list)

    class Meta:
        model = REP
        fields = [
            'id', 'repName', 'season',
            'contactName', 'phone', 'email',
            'backupContactName', 'backupPhone', 'backupEmail',
            'website', 'websiteNA', 'facebook', 'facebookNA',
            'instagram', 'instagramNA', 'telegram', 'telegramNA',
            'mouStatus', 'mouDocumentName', 'mouDocumentUrl',
            'repLogoName', 'repLogoUrl',
            'cityAssignments', 'cityAssignment',
            'numberOfCities', 'numberOfTrials', 'trialIds',
            'createdAt', 'updatedAt',
        ]

    def get_numberOfCities(self, obj):
        return obj.city_assignments.values('city').distinct().count()

    def get_numberOfTrials(self, obj):
        return obj.city_assignments.values('trial').distinct().count()

    def create(self, validated_data):
        assignment_data = validated_data.pop('cityAssignment', None)
        trial_ids = validated_data.pop('trialIds', [])

        # Get or create the REP org by name
        rep_name = validated_data.get('rep_name', '')
        existing = REP.objects.filter(rep_name__iexact=rep_name).first()

        if existing:
            rep = existing
            # Optionally update org fields
        else:
            rep = super().create(validated_data)

        # Create assignment(s) for each trial
        if assignment_data and trial_ids:
            for trial_id in trial_ids:
                REPCityAssignment.objects.get_or_create(
                    rep=rep,
                    trial_id=trial_id,
                    city=assignment_data['city'],
                    defaults=assignment_data
                )

        return rep

    def update(self, instance, validated_data):
        validated_data.pop('cityAssignment', None)  # assignments updated separately
        validated_data.pop('trialIds', None)
        return super().update(instance, validated_data)
```

### Views (`reps/views.py`)

```python
class REPViewSet(ModelViewSet):
    serializer_class = REPSerializer
    permission_classes = [IsAuthenticated, IsAdminForWrite]

    def get_queryset(self):
        qs = REP.objects.prefetch_related(
            'city_assignments', 'city_assignments__trial'
        ).all()
        params = self.request.query_params

        # Filter by city (via assignments)
        if city := params.get('city'):
            qs = qs.filter(city_assignments__city__iexact=city).distinct()
        if region := params.get('region'):
            qs = qs.filter(city_assignments__region=region).distinct()

        # Search across org + assignments
        if search := params.get('search'):
            qs = qs.filter(
                Q(rep_name__icontains=search)
                | Q(contact_name__icontains=search)
                | Q(city_assignments__city__icontains=search)
                | Q(city_assignments__state__icontains=search)
            ).distinct()

        sort = params.get('sort', 'latest')
        sort_map = {
            'latest': '-created_at',
            'oldest': 'created_at',
            'name-asc': 'rep_name',
            'name-desc': '-rep_name',
        }
        qs = qs.order_by(sort_map.get(sort, '-created_at'))
        return qs

    # list(), retrieve(), create(), update(), destroy() — same structure as current
    # Add new action for managing assignments:

    @action(detail=True, methods=['post'], url_path='assignments')
    def add_assignment(self, request, pk=None):
        """Add a city assignment to an existing REP."""
        rep = self.get_object()
        serializer = REPCityAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(rep=rep)
        return Response({
            'rep': self.get_serializer(rep).data,
            'message': 'Assignment added successfully'
        }, status=201)

    @action(detail=True, methods=['put', 'delete'],
            url_path='assignments/(?P<assignment_id>[0-9]+)')
    def manage_assignment(self, request, pk=None, assignment_id=None):
        """Update or delete a specific city assignment."""
        rep = self.get_object()
        assignment = REPCityAssignment.objects.get(id=assignment_id, rep=rep)

        if request.method == 'DELETE':
            assignment.delete()
            return Response({'message': 'Assignment removed'})

        serializer = REPCityAssignmentSerializer(assignment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'rep': self.get_serializer(rep).data,
            'message': 'Assignment updated'
        })
```

### Admin (`reps/admin.py`)

```python
class REPCityAssignmentInline(admin.TabularInline):
    model = REPCityAssignment
    extra = 0
    readonly_fields = ('created_at',)

@admin.register(REP)
class REPAdmin(admin.ModelAdmin):
    list_display = ('rep_name', 'contact_name', 'mou_status', 'created_at')
    list_filter = ('mou_status',)
    search_fields = ('rep_name', 'contact_name', 'email')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [REPCityAssignmentInline]
```

---

## Frontend Changes

### API Layer (`src/services/api.js`)

```javascript
export const repAPI = {
  // Existing (unchanged)
  getAll, getById, create, update, delete, search,

  // New: Assignment management
  addAssignment: async (repId, assignmentData) => {
    return apiService.request(`/reps/${repId}/assignments/`, {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  },

  updateAssignment: async (repId, assignmentId, data) => {
    return apiService.request(`/reps/${repId}/assignments/${assignmentId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAssignment: async (repId, assignmentId) => {
    return apiService.request(`/reps/${repId}/assignments/${assignmentId}/`, {
      method: 'DELETE',
    });
  },
};
```

### REPCard (`Repcard.jsx`)

**Before:**
```jsx
{rep.city}, {rep.state}          // Single city
Assigned Projects ({totalTrials}) // Trials from M2M
```

**After:**
```jsx
// Show all cities as chips
<Stack direction="row" spacing={0.5} flexWrap="wrap">
  {uniqueCities.map(city => <Chip label={city} size="small" />)}
</Stack>

// Show assignments grouped by project
Assignments ({rep.cityAssignments?.length || 0})
  Regular — Season 5 → Nicobar
  Regular — Season 6 → Ambala
```

### REPDetailView (`REPDetailView.jsx`)

**Section restructure:**

1. **Basic Information** — rep_name, season, contact info (org-level)
2. **City Assignments** — expandable/collapsible list:
   - Each assignment shows: Project name, City, State
   - Ground details for that city
   - Courier address for that city
3. **Online Presence** — org-level (unchanged)
4. **Legal / Documents** — org-level (unchanged)

### REPModal (`REPModal.jsx`)

**Form state split:**
```javascript
// Org-level (persisted on REP record)
const [orgData, setOrgData] = useState({
  repName: '', contactName: '', phone: '', email: '',
  backupContactName: '', backupPhone: '', backupEmail: '',
  website: '', facebook: '', instagram: '', telegram: '',
  mouStatus: 'Pending', ...
});

// City-specific (persisted on REPCityAssignment)
const [assignmentData, setAssignmentData] = useState({
  state: '', city: '', region: '',
  courierAcceptingName: '', courierAddress: '', courierPinCode: '',
  physicalAddress: '', groundLocation: '', googleMapLink: '',
  pinCode: '', groundPinCode: '', reportingTime: '',
  groundContactName: '', groundContactPhone: '', ...
});
```

**Lookup flow change:**

Current: Select Project → State → City → lookup by city+state → fill all fields

New:
1. Select Project → State → City (same as now)
2. Enter REP Name → **debounced search by rep_name**
3. **REP exists?** → Pre-fill org fields (read-only). Show message: "RUFC already exists. Adding new city assignment." User only fills city-specific fields (courier, ground).
4. **REP doesn't exist?** → Full form (org + city-specific fields)

**Save payload:**
```javascript
// New REP
{
  repName: 'Salience Foundation',
  contactName: 'Neelkanth', phone: '...', email: '...',
  // ... all org fields ...
  cityAssignment: {
    state: 'Jharkhand', city: 'Dhanbad', region: 'East',
    courierAddress: '...', groundLocation: '...', ...
  },
  trialIds: [5]  // project being assigned
}

// Existing REP — new assignment
POST /reps/{repId}/assignments/
{
  trialId: 7,
  state: 'Haryana', city: 'Ambala', region: 'North',
  courierAddress: '...', groundLocation: '...', ...
}
```

### REPManagementPage (`REPManagementPage.jsx`)

**Dashboard stats:**
```javascript
const totalREPs  = reps.length;  // Now correct — each = unique org
const totalCities = new Set(
  reps.flatMap(r => r.cityAssignments?.map(a => a.city) || [])
).size;
const totalAssignments = reps.reduce(
  (sum, r) => sum + (r.cityAssignments?.length || 0), 0
);
```

**Filters update:**
- City filter → derived from `reps.flatMap(r => r.cityAssignments?.map(a => a.city))`
- Search → searches org name + assignment cities
- Remove dead `filterStatus`, `filterPeriod` code

**Bulk import update:**
- CSV should group rows by `repName`
- Same org name → one REP record + multiple assignments
- Different org name → new REP record

---

## Implementation Sequence

| Step | Scope | Risk | Details |
|------|-------|------|---------|
| 1 | Backend model | Low | Create `REPCityAssignment` model, migration 0014 |
| 2 | Data migration | **High** | Migration 0015 — merge duplicates, move city data |
| 3 | Schema cleanup | Medium | Migration 0016 — remove old fields from REP |
| 4 | Serializer + Views | Medium | New serializers, updated endpoints, assignment actions |
| 5 | Admin | Low | Inline for assignments |
| 6 | Frontend: Card + Detail | Low | Read-only consumers, update to use `cityAssignments` |
| 7 | Frontend: Modal | **High** | Form split, lookup change, save restructure |
| 8 | Frontend: Management | Medium | Dashboard stats, filters, bulk import |
| 9 | Cleanup | Low | Remove backward-compatible shims |

---

## MariaDB 10.1.48 Considerations

- Use `atomic=False` on data migration (MariaDB 10.1 doesn't support DDL in transactions)
- All `ALTER TABLE` operations (add/drop column, add/drop index) are supported
- `CREATE TABLE` for through table is standard
- Test migrations on a copy of production data before deploying
- If migration already applied but not tracked, use `--fake`

---

## Deploy Checklist

### Backend
1. `git push origin main` from `D:\tta_frontend-main\tta_backend\`
2. On server: `cd /root/TTA/backend/ikf-tta-backend && git pull origin main`
3. `cd backend`
4. Run migrations sequentially:
   ```bash
   /root/TTA/backend/venv/bin/python manage.py migrate reps 0014
   /root/TTA/backend/venv/bin/python manage.py migrate reps 0015
   /root/TTA/backend/venv/bin/python manage.py migrate reps 0016
   ```
5. Verify: `/root/TTA/backend/venv/bin/python manage.py showmigrations reps`
6. Restart: `sudo systemctl restart tta`

### Frontend
1. `npm run build` (local)
2. Run `deploy.bat`

---

## Files to Modify

### Backend
| File | Change |
|------|--------|
| `tta_backend/backend/reps/models.py` | Restructure REP, add REPCityAssignment |
| `tta_backend/backend/reps/serializers.py` | Split into REP + Assignment serializers |
| `tta_backend/backend/reps/views.py` | Add assignment endpoints, update filters |
| `tta_backend/backend/reps/admin.py` | Add inline for assignments |
| `tta_backend/backend/reps/urls.py` | No change needed (viewset handles routing) |
| `reps/migrations/0014_*.py` | Create through table |
| `reps/migrations/0015_*.py` | Data migration |
| `reps/migrations/0016_*.py` | Remove old fields |

### Frontend
| File | Change |
|------|--------|
| `src/services/api.js` | Add assignment API methods |
| `src/components/rep/REPModal.jsx` | Split form, change lookup, update save |
| `src/components/rep/Repcard.jsx` | Show cities from assignments |
| `src/components/rep/REPDetailView.jsx` | Show assignment sections |
| `src/components/rep/REPManagementPage.jsx` | Update stats, filters, search |

---

## API Response Shape (After)

### GET /reps/ (List)
```json
{
  "reps": [
    {
      "id": 1,
      "repName": "RUFC",
      "contactName": "Nirja",
      "phone": "9876543210",
      "email": "nirja@rufc.org",
      "mouStatus": "Pending",
      "cityAssignments": [
        {
          "id": 1,
          "trialId": 3,
          "trialName": "Regular — Season 5",
          "trialType": "Regular",
          "trialSeason": "Season 5",
          "state": "Andaman and Nicobar Islands",
          "city": "Nicobar",
          "region": "",
          "courierAddress": "...",
          "groundLocation": "...",
          "createdAt": "2026-03-28T..."
        },
        {
          "id": 2,
          "trialId": 5,
          "trialName": "Regular — Season 6",
          "trialType": "Regular",
          "trialSeason": "Season 6",
          "state": "Haryana",
          "city": "Ambala",
          "region": "North",
          "courierAddress": "...",
          "groundLocation": "...",
          "createdAt": "2026-03-29T..."
        }
      ],
      "numberOfCities": 2,
      "numberOfTrials": 2,
      "createdAt": "2026-03-28T..."
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 100
}
```
