// The header and breadcrumb read from a flat pathname -> title map. Dynamic
// routes (App.js path params) never equal a literal key, so they used to miss
// the map entirely and fall back to the literal string "Dashboard" -- looking,
// to anyone glancing at the header, exactly like the click "did nothing" and
// bounced back to the main page. This pins the header/breadcrumb text for a
// static route, both dynamic routes (/trials/:id and /csr/:id), and an unknown
// path, so a regression on any of them goes red here.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// react-router-dom v7 does not resolve under jest in this repo at all, so the
// mock has to be `virtual` -- a plain jest.mock fails with "Cannot find
// module" before it can substitute anything. useLocation is mutable per test
// via __setPathname; Outlet/Navigate are rendered as plain markers so the
// test can assert on them without pulling in real routing.
let mockPathname = '/dashboard';
jest.mock(
  'react-router-dom',
  () => ({
    __esModule: true,
    useLocation: () => ({ pathname: mockPathname }),
    useNavigate: () => jest.fn(),
    Outlet: () => <div data-testid="outlet" />,
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  }),
  { virtual: true },
);

jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test User', role: 'ADMIN', email: 'test@example.com' },
    logout: jest.fn(),
  }),
}));

jest.mock('../../auth/loginDoor', () => ({ expiredSessionLoginPath: () => '/login' }));

const DashboardLayout = require('./DashboardLayout').default;

function setPathname(pathname) {
  mockPathname = pathname;
}

// A dummy sidebar keeps this test isolated to DashboardLayout's own title
// logic -- the real Sidebar pulls in useGrants/matchRoutes and is out of scope.
const DummySidebar = () => <div data-testid="sidebar" />;

function renderAt(pathname) {
  setPathname(pathname);
  return render(<DashboardLayout sidebar={DummySidebar} />);
}

describe('DashboardLayout header/breadcrumb title', () => {
  it('renders the exact-match title for a static CSR route', () => {
    renderAt('/csr/projects');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Projects');
    expect(screen.getByText('Home / Projects')).toBeInTheDocument();
  });

  it('resolves a real CSR project id (/csr/:id) instead of falling back to Dashboard', () => {
    renderAt('/csr/42');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Project');
    expect(screen.getByText('Home / Project')).toBeInTheDocument();
    expect(screen.queryByText('Home / Dashboard')).not.toBeInTheDocument();
  });

  it('resolves a real trial id (/trials/:id) instead of falling back to Dashboard', () => {
    renderAt('/trials/17');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Project');
    expect(screen.getByText('Home / Project')).toBeInTheDocument();
  });

  it('falls back to Dashboard for a genuinely unknown path', () => {
    renderAt('/some/unmapped/route');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    expect(screen.getByText('Home / Dashboard')).toBeInTheDocument();
  });
});
