# TTA Frontend

Trial Tracking Application frontend built with React, Material-UI, and Tailwind CSS.

**Backend repo:** [ikf-tta-backend](https://github.com/indiakhelofootball/ikf-tta-backend)

## Tech Stack

- React 19
- Material-UI (MUI) 7
- React Router 7
- Tailwind CSS 3
- Axios (HTTP client)
- country-state-city (India state/city dropdowns)
- dayjs (date handling)

## Prerequisites

- Node.js 18+
- npm 9+
- Backend API running (see backend repo)

## Setup

```bash
# Clone
git clone https://github.com/indiakhelofootball/ikf-tta-frontend.git
cd ikf-tta-frontend

# Install dependencies
npm install

# Start dev server
npm start
```

App runs at `http://localhost:3000`

## Environment Variables

Create a `.env` file in the root (optional - defaults to localhost):

```
REACT_APP_API_URL=http://localhost:8000/api
```

For production:
```
REACT_APP_API_URL=https://tta.indiakhelofootball.com/api
```

## Build for Production

```bash
npm run build
```

Output goes to `build/` folder.

## Project Structure

```
src/
├── auth/                  # Auth context, roles, permissions, protected routes
│   ├── AuthContext.js
│   ├── roles.js           # SUPER_ADMIN, ADMIN, REP role definitions
│   └── RoleBasedRoute.jsx
├── components/
│   ├── dashboard/         # Dashboard home page
│   ├── layout/            # Sidebar, MainLayout
│   ├── profile/           # User profile page
│   ├── rep/               # REP management (CRUD, bulk import, detail view)
│   ├── trials/            # Trial management (wizard, list, detail)
│   ├── trialCities/       # Trial cities management
│   └── vendors/           # Vendor management (CRUD, detail view)
├── services/
│   └── api.js             # All API calls (auth, trials, reps, trialCities, vendors)
├── utils/                 # Utility functions
├── App.js                 # Routes and app structure
└── index.js               # Entry point
```

## Pages & Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/login` | LoginPage | Public |
| `/dashboard` | DashboardHome | All authenticated |
| `/trials` | TrialManagementPage | All authenticated |
| `/trials/new` | TrialWizard | Admin+ |
| `/rep-management` | REPManagementPage | Admin+ |
| `/trial-cities` | TrialCitiesPage | Admin+ |
| `/vendors` | VendorManagementPage | Admin+ |
| `/profile` | ProfilePage | All authenticated |

## Roles

| Role | Access |
|------|--------|
| **SUPER_ADMIN** | Full access to everything |
| **ADMIN** | All features except user management |
| **REP** | View-only access to trials, cities, payments |

## API Integration

All API calls go through `src/services/api.js` which handles:
- JWT token management (auto-refresh on 401)
- Base URL configuration via environment variable
- Consistent error handling

### API Endpoints Used

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /api/auth/login/`, `POST /api/auth/register/`, `POST /api/auth/logout/`, `GET /api/auth/profile/` |
| Trials | `GET/POST /api/trials/`, `GET/PUT/DELETE /api/trials/:id/` |
| REPs | `GET/POST /api/reps/`, `GET/PUT/DELETE /api/reps/:id/` |
| Trial Cities | `GET/POST /api/trial-cities/`, `GET/PUT/DELETE /api/trial-cities/:code/` |
| Vendors | `GET/POST /api/vendors/`, `GET/PUT/DELETE /api/vendors/:id/` |

## Vendor Management

- Vendors page shows all vendors + REPs merged together
- REPs automatically appear as vendor type "REP" (fetched live from REP API)
- REP-sourced vendors are read-only on vendor page (edit from REP Management)
- Regular vendors support full CRUD with status flow: Pending → Verified / Rejected

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run dev server on port 3000 |
| `npm run build` | Production build |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code with Prettier |

## Author

Abhishek Anshuman
