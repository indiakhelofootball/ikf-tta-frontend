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

function Fact({ label, value, kind, tone }) {
  const has = value !== null && value !== undefined && value !== '';
  return (
    <div className={`ovf k-${kind}`}>
      <dt className="ovf-k">{label}</dt>
      <dd className={`ovf-v${tone ? ` ${tone}` : ''}${has ? '' : ' em'}`}>{has ? value : '\u2014'}</dd>
    </div>
  );
}

export default function CSRProjectDetailView({ project }) {
  if (!project) return null;
  const amount =
    project.sanctionedAmount != null
      ? `\u20b9${Number(project.sanctionedAmount).toLocaleString('en-IN')}`
      : null;
  const freeze = certificateFreezeState(project);
  const identity = ttaProjectIdentity(project);
  const closed = (project.status || '').toLowerCase() === 'closed';

  return (
    <div className="csrx ovw">
      {/* One strip, seven facts. These are a caption on a single record, so
          boxing them into groups made four objects to read where there should
          be one glance -- and the boxes took more room than the values in them.
          The colour moved onto the labels instead: each wears the hue its kind
          of value carries in the tables, so identity, money, term and state are
          separable at a glance without any of them growing a border. */}
      <dl className="ovw-strip">
        <Fact
          kind="id"
          label="TTA Project"
          // Not a dash. Every grant raised before this link existed is unlinked,
          // and a bare em dash would read as a bug on all of them -- this says
          // which state it is, and that a person has to resolve it.
          value={identity || 'Not linked yet'}
          tone={identity ? undefined : 'em'}
        />
        <Fact kind="id" label="Client / Funder" value={project.clientName} />
        <Fact kind="money" label="Sanctioned" value={amount} tone="money" />
        <div className="ovf k-state">
          <dt className="ovf-k">Status</dt>
          <dd className="ovf-v">
            <span className={`pill ${closed ? 'closed' : 'act'}`}>
              {project.status || 'Unknown'}
            </span>
          </dd>
        </div>
        <Fact kind="term" label="Start" value={fmtDay(project.startDate)} />
        <Fact kind="term" label="End" value={fmtDay(project.endDate)} />
        <div className="ovf k-state">
          <dt className="ovf-k">Certificate</dt>
          <dd className="ovf-v">
            {/* A title attribute, not a tooltip component. The description
                explains what freezing means and is worth keeping, but it does
                not justify holding MUI in this file for one label. */}
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

      {project.description && (
        <section className="ovw-desc">
          <h3>Description</h3>
          <p>{project.description}</p>
        </section>
      )}
    </div>
  );
}
