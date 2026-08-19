// src/components/csr/CSRUtilisationPage.jsx
// Utilisation Certificate, across every grant — the fifth sidebar destination
// from the 28 May visual flow. One row per grant, each row the same figures the
// per-project certificate and its PDF report.
//
// WHAT THIS PAGE IS: the ledger. Every figure here comes from the server's
// certificate endpoint, never from a browser-side sum of expense tags — the
// endpoint already applies the 'Payment Done' rule, and a second implementation
// would eventually disagree with a document a funder has already filed.
//
// THE DEFECT THIS PAGE FIXES. `totalUtilised` counts only tags whose payment
// actually completed. Tags sitting at Draft, Sent to Accounts or Bounced come
// back in `excludedItems` and are counted NOWHERE. A screen that shows the total
// alone reports a number that is correct and a shortfall that is invisible — and
// a bounced payment is someone's job to fix. So both figures are on every row,
// and the excluded one is never collapsed into a footnote.
//
// COLOUR. Four inks, each doing exactly its own job:
//   moss   — money utilised, the counted total and the progress bar
//   indigo — the sanctioned amount: what the funder promised
//   clay   — tagged but not counted, and any overspend. Needs a decision.
//   teal   — the funder's name. The one outward-facing thing on the row.
//   plum   — a closed grant's frozen certificate: the figures no longer move.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Container, InputAdornment, Skeleton, Stack, TextField, Typography,
} from '@mui/material';
import {
  ReceiptLongOutlined as CertificateIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import { ttaProjectIdentity } from './CSRProjectDetailView';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import { certificateFreezeState } from './csrContractRules';
import { surfaces, inks, figure, fonts, tabular } from '../../styles/ttaTheme';

const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

const num = (v) => Number(v) || 0;
const rupees = (v) => `₹${num(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function Figure({ label, value, color }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ ...figure.row, color, whiteSpace: 'nowrap' }}>{value}</Box>
      <Box sx={figure.unit}>{label}</Box>
    </Box>
  );
}

export default function CSRUtilisationPage() {
  const navigate = useNavigate();
  const { canView } = useGrants();
  // Reading the certificate is unlocked by either grant — MODULE_DEPENDENCIES
  // maps 'csr' to read access on 'csr_certificate'. Tagging still needs the
  // stricter grant, and nothing on this page tags.
  const allowed = canView('csr_certificate') || canView('csr');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const projects = asList(await csrAPI.projects.getAll());
      // One certificate request per grant. There is no bulk endpoint, and the
      // per-project one is the only server-authoritative source — so a failure
      // on one grant leaves that row marked unavailable rather than taking the
      // whole page down with it.
      const certs = await Promise.all(
        projects.map((p) => csrAPI.utilisationCertificate(p.id).catch(() => null)),
      );
      setRows(projects.map((p, i) => ({ project: p, cert: certs[i] })));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load utilisation.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { if (allowed) load(); }, [load, allowed]);
  useRefetchOnFocus(() => { if (allowed) load(true); });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(({ project }) => [project.name, project.clientName, ttaProjectIdentity(project)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q)));
  }, [rows, search]);

  // Portfolio totals. Both halves, for the same reason each row carries both.
  const totals = useMemo(() => visible.reduce((acc, { project, cert }) => {
    const excluded = (cert?.excludedItems || []).reduce((s, x) => s + num(x.amount), 0);
    return {
      sanctioned: acc.sanctioned + num(project.sanctionedAmount),
      utilised: acc.utilised + num(cert?.totalUtilised),
      excluded: acc.excluded + excluded,
      excludedCount: acc.excludedCount + (cert?.excludedItems || []).length,
    };
  }, { sanctioned: 0, utilised: 0, excluded: 0, excludedCount: 0 }), [visible]);

  if (!allowed) {
    return <Alert severity="warning">You do not have access to the utilisation certificate.</Alert>;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: 1.5, flex: 'none',
          display: 'grid', placeItems: 'center',
          bgcolor: inks.moss.tint, color: inks.moss.text,
          '& svg': { fontSize: 18 },
        }}>
          <CertificateIcon />
        </Box>
        <Typography variant="h4">Utilisation Certificate</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Every grant, with what has actually been spent against it. Only expenses
        whose payment has completed are counted — anything tagged but still in
        flight is shown separately, never folded into the total.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && (
        <Box sx={{
          bgcolor: surfaces.surface,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          p: 3,
          mb: 2,
        }}>
          <Box sx={{ ...figure.hero, color: inks.moss.text }}>{rupees(totals.utilised)}</Box>
          <Box sx={figure.unit}>
            counted as utilised, of {rupees(totals.sanctioned)} sanctioned across{' '}
            {visible.length} {visible.length === 1 ? 'grant' : 'grants'}
          </Box>
          {totals.excludedCount > 0 && (
            <Box sx={{
              mt: 1.5,
              px: 1.5,
              py: 1,
              borderRadius: 1.5,
              bgcolor: inks.clay.tint,
              color: inks.clay.text,
              fontFamily: fonts.sans,
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}>
              {rupees(totals.excluded)} tagged across {totals.excludedCount}{' '}
              {totals.excludedCount === 1 ? 'expense' : 'expenses'} is not counted —
              the payment has not completed.
            </Box>
          )}
        </Box>
      )}

      <TextField
        size="small"
        placeholder="Search grant or funder"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ),
          },
        }}
      />

      {loading ? (
        <Stack spacing={1.5}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={120} />)}
        </Stack>
      ) : visible.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3 }}>
          {rows.length === 0 ? 'No grants yet.' : 'No grants match this search.'}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {visible.map(({ project, cert }) => {
            const freeze = certificateFreezeState(project);
            const sanctioned = num(project.sanctionedAmount);
            const utilised = num(cert?.totalUtilised);
            const excludedItems = cert?.excludedItems || [];
            const excluded = excludedItems.reduce((s, x) => s + num(x.amount), 0);
            const pct = sanctioned > 0 ? (utilised / sanctioned) * 100 : 0;
            const over = sanctioned > 0 && utilised > sanctioned;

            return (
              <Box
                key={project.id}
                component="button"
                type="button"
                onClick={() => navigate(`/csr/${project.id}`)}
                sx={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  font: 'inherit',
                  cursor: 'pointer',
                  bgcolor: surfaces.surface,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 2.5,
                  transition: 'box-shadow 160ms cubic-bezier(0, 0, 0.2, 1), border-color 160ms cubic-bezier(0, 0, 0.2, 1)',
                  '&:hover': { borderColor: surfaces.hairline, boxShadow: '0 2px 4px rgba(20,28,24,0.06)' },
                }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: { md: 'baseline' }, mb: 1.5 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" component="div">{project.name}</Typography>
                    <Box sx={{ ...figure.unit, color: inks.teal.text }}>
                      {project.clientName || 'Funder not recorded'}
                    </Box>
                    {/* Which TTA project this grant funds. Neutral, not inked:
                        an identity is not money, a promise or a decision. Set
                        only — an unlinked grant reads exactly as before, and
                        the one place that says so is the Overview panel. */}
                    {ttaProjectIdentity(project) && (
                      <Box sx={figure.unit}>{ttaProjectIdentity(project)}</Box>
                    )}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      alignSelf: { xs: 'flex-start', md: 'auto' },
                      px: 1,
                      py: 0.25,
                      borderRadius: 9999,
                      fontFamily: fonts.sans,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      bgcolor: freeze.frozen ? inks.plum.tint : surfaces.sunken,
                      color: freeze.frozen ? inks.plum.text : 'text.secondary',
                    }}
                  >
                    {freeze.frozen ? `Frozen · v${freeze.version}` : 'Live'}
                  </Box>
                </Stack>

                {cert === null ? (
                  <Typography variant="body2" color="text.secondary">
                    Certificate figures are unavailable for this grant.
                  </Typography>
                ) : (
                  <>
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                      gap: 2,
                      mb: 1.5,
                    }}>
                      <Figure
                        label="utilised, counted"
                        value={rupees(utilised)}
                        color={over ? inks.clay.text : inks.moss.text}
                      />
                      <Figure
                        label="sanctioned"
                        value={rupees(sanctioned)}
                        color={inks.indigo.text}
                      />
                      <Figure
                        label={excludedItems.length === 1
                          ? 'tagged, not counted (1 expense)'
                          : `tagged, not counted (${excludedItems.length} expenses)`}
                        value={rupees(excluded)}
                        color={excluded > 0 ? inks.clay.text : 'text.secondary'}
                      />
                      <Figure
                        label="line items on the certificate"
                        value={(cert.lineItems || []).length}
                        color="text.primary"
                      />
                    </Box>

                    {/* The bar reads against the sanctioned amount, so a grant
                        that has overspent shows a full clay bar rather than a
                        moss one that quietly stops at 100%. */}
                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: surfaces.sunken, overflow: 'hidden' }}>
                      <Box sx={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, pct))}%`,
                        bgcolor: over ? inks.clay.fill : inks.moss.fill,
                      }} />
                    </Box>
                    <Box sx={{ ...figure.unit, ...tabular, mt: 0.75 }}>
                      {sanctioned > 0 ? `${pct.toFixed(1)}% of the sanctioned amount` : 'No sanctioned amount recorded'}
                      {over && ' — over sanction'}
                    </Box>

                    {/* A tag outside the grant period is a third way for money to
                        go missing from the total. It is reported, not coloured:
                        it is a period question for the operator, not an
                        exception to act on today. */}
                    {num(cert.outOfPeriodCount) > 0 && (
                      <Box sx={{ ...figure.unit, mt: 0.5 }}>
                        {cert.outOfPeriodCount} tagged{' '}
                        {num(cert.outOfPeriodCount) === 1 ? 'expense falls' : 'expenses fall'}{' '}
                        outside the grant period
                        {(cert.periodStart || cert.periodEnd) &&
                          ` (${cert.periodStart || 'inception'} to ${cert.periodEnd || 'date'})`}
                        {' '}and is not included.
                      </Box>
                    )}
                  </>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Container>
  );
}
