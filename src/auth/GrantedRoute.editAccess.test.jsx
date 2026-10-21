// V: a CSR view-only user who opens an edit or new form (by link or typed URL)
// is told they can view but not change CSR, inside the CSR shell, instead of
// being handed a form whose Save the server then refuses.
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GrantedRoute from './GrantedRoute';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  Navigate: ({ to }) => <div>redirect:{to}</div>,
}), { virtual: true });

let mockAuth;
jest.mock('./AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('./loginDoor', () => ({ expiredSessionLoginPath: () => '/login' }));

const as = (grants, { isSuperAdmin = false } = {}) => {
  mockAuth = {
    isAuthenticated: true, user: { role: 'ADMIN' }, permsLoading: false,
    perms: { isSuperAdmin, grants },
  };
};

const FORM = <div>the form</div>;
const DENIED = <div>can view, not change</div>;

test('edit grant: the form opens', () => {
  as({ csr: { can_view: true, can_edit: true } });
  render(<GrantedRoute module="csr" edit denied={DENIED}>{FORM}</GrantedRoute>);
  expect(screen.getByText('the form')).toBeInTheDocument();
});

test('view-only: the no-edit page instead of the form', () => {
  as({ csr: { can_view: true, can_edit: false } });
  render(<GrantedRoute module="csr" edit denied={DENIED}>{FORM}</GrantedRoute>);
  expect(screen.getByText('can view, not change')).toBeInTheDocument();
  expect(screen.queryByText('the form')).toBeNull();
});

test('no CSR grant at all: still sent to /unauthorized, as before', () => {
  as({});
  render(<GrantedRoute module="csr" edit denied={DENIED}>{FORM}</GrantedRoute>);
  expect(screen.getByText('redirect:/unauthorized')).toBeInTheDocument();
});

test('unchanged: an edit route with no denied page still redirects a view-only user', () => {
  as({ csr: { can_view: true, can_edit: false } });
  render(<GrantedRoute module="csr" edit>{FORM}</GrantedRoute>);
  expect(screen.getByText('redirect:/unauthorized')).toBeInTheDocument();
});

test('unchanged: a view route opens for a view-only user', () => {
  as({ csr: { can_view: true, can_edit: false } });
  render(<GrantedRoute module="csr" denied={DENIED}>{FORM}</GrantedRoute>);
  expect(screen.getByText('the form')).toBeInTheDocument();
});

test('super admin: the form opens whatever the grants say', () => {
  as({}, { isSuperAdmin: true });
  render(<GrantedRoute module="csr" edit denied={DENIED}>{FORM}</GrantedRoute>);
  expect(screen.getByText('the form')).toBeInTheDocument();
});

describe('expense tags need the certificate edit grant, as the server does', () => {
  const route = <GrantedRoute module="csr_certificate" edit viewModule="csr" denied={DENIED}>{FORM}</GrantedRoute>;

  test('certificate edit: the form opens', () => {
    as({ csr: { can_view: true, can_edit: false }, csr_certificate: { can_view: true, can_edit: true } });
    render(route);
    expect(screen.getByText('the form')).toBeInTheDocument();
  });

  test('CSR edit without the certificate grant: the no-edit page', () => {
    as({ csr: { can_view: true, can_edit: true } });
    render(route);
    expect(screen.getByText('can view, not change')).toBeInTheDocument();
  });
});
