// "Switch to TTA" is the CSR app's one door out (owner, 16 Nov 2026). It shows
// only to a user who can open a TTA module, so a CSR-only operator still never
// sees a way into the ledger (the 13 Aug containment rule).
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock(
  'react-router-dom',
  () => ({
    __esModule: true,
    useLocation: () => ({ pathname: '/csr/projects' }),
    useNavigate: () => jest.fn(),
    matchRoutes: () => null,
    NavLink: ({ to, children, className }) => (
      <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className}>{children}</a>
    ),
  }),
  { virtual: true },
);

let mockRole = 'CSR_OPS';
let mockGrants = {};
jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Nirja', role: mockRole, email: 'n@example.com' }, logout: jest.fn() }),
}));
jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({
    isSuper: mockRole === 'SUPER_ADMIN',
    canView: (m) => mockRole === 'SUPER_ADMIN' || !!mockGrants[m],
    canEdit: () => false,
    permsLoading: false,
  }),
}));

const CSRSidebar = require('./CSRSidebar').default;

const renderAs = (role, grants) => {
  mockRole = role;
  mockGrants = grants;
  return render(<CSRSidebar collapsed={false} onToggle={() => {}} />);
};

test('a CSR-only operator gets no way into TTA', () => {
  renderAs('CSR_OPS', { csr: true });
  expect(screen.queryByText('Switch to TTA')).not.toBeInTheDocument();
});

test('a user who can open a TTA module gets Switch to TTA, pointing at the TTA app', () => {
  renderAs('CSR_OPS', { csr: true, payments: true });
  expect(screen.getByRole('link', { name: /Switch to TTA/ })).toHaveAttribute('href', '/');
});

test('a super admin gets Switch to TTA', () => {
  renderAs('SUPER_ADMIN', {});
  expect(screen.getByText('Switch to TTA')).toBeInTheDocument();
});
