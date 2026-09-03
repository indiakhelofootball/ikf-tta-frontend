import React from 'react';

import { certificateFreezeState } from './csrContractRules';
import '../../styles/csrDesign.css';

// The grant's place in the TTA catalogue: the same project-name + season pair
// TTA uses everywhere else. Both halves are optional and independently so —
// grants raised before the link existed carry neither — so whatever is present
// is shown and the caller decides how to say "nothing yet".
export function ttaProjectIdentity(project) {
  if (!project) return '';
  return [project.ttaProjectName, project.season].filter(Boolean).join(' · ');
}

// The strip rendered startDate and endDate straight from the API, so a term
// read "2026-04-05 / 2027-04-05" here while every other CSR surface says
// "05 Apr 2026".
const fmtDay = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Fact({ label, value, tone }) {
  const has = value !== null && value !== undefined && value !== '';
  return (
    <div className="ovf">
      <dt className="ovf-k">{label}</dt>
      <dd className={`ovf-v${tone ? ` ${tone}` : ''}${has ? '' : ' em'}`}>{has ? value : '—'}</dd>
    </div>
  );
}

export default function CSRProjectDetailView({ project }) {
  if (!project) return null;
  const amount =
    project.sanctionedAmount != null
      ? `₹${Number(project.sanctionedAmount).toLocaleString('en-IN')}`
      : null;
  const freeze = certificateFreezeState(project);
  const identity = ttaProjectIdentity(project);
  const closed = (project.status || '').toLowerCase() === 'closed';

  return (
    <div className="csrx ovw">
      {/* Four groups, each carrying the colour its kind of value already carries
          in the tables: identity indigo, money sand, term teal, state its own
          semantic pill. This was one undifferentiated run of grey label/value
          pairs, so finding one fact meant reading all seven. Grouping by meaning
          is what the colour is for, and it is the same lesson the table columns
          teach — so it only has to be learned once. */}
      <div className="ovw-grid">
        <section className="ovg ovg--id">
          <h3 className="ovg-h">Identity</h3>
          <dl className="ovg-l">
            <Fact
              label="TTA Project"
              // Not a dash. Every grant raised before this link existed is
              // unlinked, and a bare em dash would read as a bug on all of
              // them — this says which state it is, and that a person has to
              // resolve it.
              value={identity || 'Not linked yet'}
              tone={identity ? undefined : 'em'}
            />
            <Fact label="Client / Funder" value={project.clientName} />
          </dl>
        </section>

        <section className="ovg ovg--money">
          <h3 className="ovg-h">Grant</h3>
          <dl className="ovg-l">
            <Fact label="Sanctioned" value={amount} tone="money" />
          </dl>
        </section>

        <section className="ovg ovg--term">
          <h3 className="ovg-h">Term</h3>
          <dl className="ovg-l">
            <Fact label="Start" value={fmtDay(project.startDate)} />
            <Fact label="End" value={fmtDay(project.endDate)} />
          </dl>
        </section>

        <section className="ovg ovg--state">
          <h3 className="ovg-h">State</h3>
          <dl className="ovg-l">
            <div className="ovf">
              <dt className="ovf-k">Status</dt>
              <dd className="ovf-v">
                <span className={`pill ${closed ? 'closed' : 'act'}`}>
                  {project.status || 'Unknown'}
                </span>
              </dd>
            </div>
            <div className="ovf">
              <dt className="ovf-k">Certificate</dt>
              <dd className="ovf-v">
                {/* A title attribute, not a tooltip component. The description
                    explains what freezing means and is worth keeping, but it
                    does not justify holding MUI in this file for one label. */}
                <span className={`pill ${freeze.frozen ? 'wait' : 'act'}`} title={freeze.description}>
                  {freeze.frozen && (
                    <svg className="ovf-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 018 0v4" />
                    </svg>
                  )}
                  {freeze.label}
                </span>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {project.description && (
        <section className="ovw-desc">
          <h3 className="ovg-h">Description</h3>
          <p>{project.description}</p>
        </section>
      )}
    </div>
  );
}
