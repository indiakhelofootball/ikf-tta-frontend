// CSR Account — the signed-in user's own page, inside the CSR shell.
//
// It exists because the rail's account menu used to point at /profile, which
// lives under TTA's layout: clicking it dropped a CSR operator out of CSR and
// into the ledger's chrome, past a door they may not even have access to. CSR
// is its own front door at /csr/login, so it needs its own account page.
//
// Read-only on purpose. This shows who you are and what you can reach; it does
// not edit the user, because CSR does not own the user record — Admin does.
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import useGrants from '../../auth/useGrants';
import '../../styles/csrDesign.css';

// The modules a CSR person can hold. Named here rather than read from the
// grant list so the page shows what was NOT granted too — an empty list and a
// list of denials look identical otherwise.
const CSR_MODULES = [
  ['csr', 'CSR', 'Grants, activities, reports and contacts.'],
  ['csr_certificate', 'Utilisation certificate', 'Tag payments to a grant and issue the certificate.'],
  ['payments', 'Payments', 'The payment ledger a utilisation figure is drawn from.'],
  ['workorders', 'Work orders', 'The signed contract a grant is measured against.'],
  ['vendors', 'Partners', 'Delivery partners an activity can be assigned to.'],
];

const initials = (name) =>
  String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

export default function CSRAccountPage() {
  const { user, logout } = useAuth();
  const { canView, canEdit } = useGrants();
  const navigate = useNavigate();

  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || user?.email || '—';

  const signOut = () => {
    logout();
    navigate('/csr/login', { replace: true });
  };

  return (
    <div className="csrx csrx-page">
      <div className="ph">
        <div>
          <h2>Account</h2>
          <p>Who you are signed in as, and what this account can reach.</p>
        </div>
      </div>

      <div className="acct">
        <div className="panel">
          <div className="dtl">
            <div className="acct-id">
              <span className="acct-av">{initials(name)}</span>
              <div>
                <h3>{name}</h3>
                <div className="sub">{user?.email || '—'}</div>
              </div>
            </div>

            <div className="facts nb">
              <div className="fc">
                <div className="fl">Role</div>
                <div className="fv">{user?.role || '—'}</div>
              </div>
              <div className="fc">
                <div className="fl">Email</div>
                <div className="fv">{user?.email || '—'}</div>
              </div>
              <div className="fc">
                <div className="fl">Signed in at</div>
                <div className="fv">CSR</div>
              </div>
              <div className="fc">
                <div className="fl">Status</div>
                <div className="fv gr">Active</div>
              </div>
            </div>

            <div className="acct-actions">
              <button type="button" className="newbtn danger" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="dtl">
            <h4 className="acct-h">Access</h4>
            <p className="acct-note">
              Access is granted per module by an administrator. Ask one to change anything here.
            </p>

            {CSR_MODULES.map(([key, label, why]) => {
              const view = canView(key);
              const edit = canEdit(key);
              const level = edit ? 'Edit' : view ? 'View' : 'No access';
              return (
                <div key={key} className="acct-row">
                  <div>
                    <div className="acct-row-name">{label}</div>
                    <div className="acct-row-why">{why}</div>
                  </div>
                  <span className={`pill ${edit ? 'act' : view ? 'wait' : 'closed'}`}>{level}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
