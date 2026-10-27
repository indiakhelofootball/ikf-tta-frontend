import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Button, CircularProgress, IconButton, Menu, MenuItem } from '@mui/material';
import { Download as DownloadIcon, Menu as MenuIcon } from '@mui/icons-material';

import { clientAPI } from '../../services/api';
import { downloadCertificatePdf } from '../../utils/certificatePdf';
import { openDownloadedFile } from '../../utils/reportFile';
import { useAuth } from '../../auth/AuthContext';
import clientThemeFrom, { brandCssVars } from './clientTheme';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import {
  formatDate, formatRange, formatCount, formatRupees, formatUpdated, formatActivityCount,
} from './clientFormat';
import {
  grantProgress, monthStrip, placesReached, activityPlace, latestFirst, activityDate, byMonth, reportDate,
} from './clientReport';
import '../../styles/clientPortal.css';
import ClientChangePasswordDialog from './ClientChangePasswordDialog';

// The six tabs, keyed by the word that goes in the URL hash. The hash is the
// tab's address: a funder who reloads on Reports, or presses Back, stays where
// they were instead of being thrown to the landing tab.
const TABS = [
  { key: 'project', label: () => 'Overview' },
  { key: 'activities', label: (c) => `Activities (${c.activities})` },
  { key: 'athletes', label: (c) => `Athletes (${formatCount(c.athletes)})` },
  { key: 'reports', label: (c) => `Reports (${formatCount(c.reports)})` },
  { key: 'deliverables', label: (c) => `Deliverables (${formatCount(c.deliverables)})` },
  { key: 'certificate', label: () => 'Certificate' },
];
const TAB_KEYS = TABS.map((t) => t.key);

const tabFromHash = () => {
  const key = (window.location.hash || '').replace(/^#/, '');
  return TAB_KEYS.includes(key) ? key : 'project';
};

const deliverablePercent = (d) => {
  const target = Number(d.targetCount) || 0;
  if (target <= 0 || !hasResult(d)) return null;
  return Math.min(100, Math.round(((Number(d.completedCount) || 0) / target) * 100));
};

// A target nobody has reported a figure for yet. Drawn as "No result recorded
// yet", never as 0: zero would tell the funder nothing happened, when all we
// know is that no figure has been entered.
const hasResult = (d) => d.completedCount != null;
const NO_RESULT = 'No result recorded yet';
// D-032: staff mark a closed grant's missed target; the portal only repeats it.
const notDelivered = (d) => d.status === 'Not Delivered';
const NOT_DELIVERED = 'Not delivered';

// Helper to determine the Financial Year string (e.g. "FY 2026-27")
const getProjectFY = (p) => {
  if (!p) return 'General';
  if (p.financialYear) {
    return p.financialYear.startsWith('FY') ? p.financialYear : `FY ${p.financialYear}`;
  }
  if (!p.startDate) return 'General';
  const d = new Date(p.startDate);
  if (isNaN(d.getTime())) return 'General';
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const startY = m >= 4 ? y : y - 1;
  return `FY ${startY}-${String(startY + 1).slice(-2)}`;
};

// A funder whose login has no grant linked gets 403 with code "no_project" from
// every /api/client/ call. That is an account still being set up, not a fault,
// so it takes the friendly empty state rather than the failure one. api.js puts
// the parsed body on err.response.data.
const isNoGrant = (err) => {
  const res = err?.response;
  if (!res || res.status !== 403) return false;
  const data = res.data || {};
  return data.code === 'no_project' || data.detail?.code === 'no_project';
};

// The funder's copy of the Utilisation Certificate. Everything printed here
// comes from the server's frozen snapshot — nothing is summed in the browser,
// because this is the document that gets filed and a second implementation of
// the total would eventually disagree with the one on record. The 'funder'
// variant is what enforces the isolation boundary — see certificatePdf.js.
const downloadCertificate = (cert) => downloadCertificatePdf(cert, { variant: 'funder' });

export const asList = (d) => (Array.isArray(d) ? d : d?.results || []);

// Where the portal's data comes from. The funder's own portal reads the
// /api/client/ endpoints; the staff preview (FunderPreviewPage) passes its own
// source with the same calls, so both render through this one page.
export const funderSource = {
  branding: (projectId) => clientAPI.myBranding(projectId),
  data: async (projectId, includeProjects = true) => {
    const fetchCalls = [
      clientAPI.activities(projectId),
      clientAPI.reports(projectId),
      clientAPI.deliverables(projectId),
      clientAPI.athletes ? clientAPI.athletes(projectId) : Promise.resolve([]),
    ];
    if (includeProjects) {
      fetchCalls.unshift(clientAPI.project(projectId));
    }
    const results = await Promise.all(fetchCalls);
    const p = includeProjects ? results.shift() : null;
    const [acts, reps, dels, aths] = results;
    const projects = p ? asList(p) : null;
    return {
      projects,
      project: projects ? ((projectId ? projects.find((x) => x.id === projectId) : null) || projects[0] || null) : null,
      activities: asList(acts),
      reports: asList(reps),
      deliverables: asList(dels),
      athletes: asList(aths),
    };
  },
  certificate: (projectId) => clientAPI.certificate(projectId),
  activityPhoto: (activityId, photoId, version) => clientAPI.activityPhoto(activityId, photoId, version),
  reportFile: (reportId) => clientAPI.reportFile(reportId),
};

// One deliverable as a row. The same row on the landing tab and on the
// Deliverables tab, so the two cannot drift apart; `detailed` adds the due
// date and the stored status.
function DeliverableRow({ d, detailed }) {
  const percent = deliverablePercent(d);
  const target = Number(d.targetCount) || 0;
  const done = Number(d.completedCount) || 0;
  const exceeded = target > 0 && done > target;
  const due = detailed ? formatDate(d.dueDate) : '';
  return (
    <li className="crow crow-wrap">
      <div className="crow-main">
        <div className="crow-t">{d.title}</div>
        {due && <div className="crow-s">Due {due}</div>}
      </div>
      <div className="crow-end">
        {hasResult(d) ? (
          <div>
            <span className="cfig">{formatCount(done)}</span>
            {d.targetCount != null && (
              <span className="crow-s"> of {formatCount(d.targetCount)}</span>
            )}
          </div>
        ) : !(detailed && notDelivered(d)) && (
          <div className="crow-s">{notDelivered(d) ? NOT_DELIVERED : NO_RESULT}</div>
        )}
        {exceeded && <div className="cnote">Target exceeded</div>}
        {detailed && d.status && (
          <span className={`cpill${d.status === 'Completed' ? ' ok' : ''}`}>{d.status}</span>
        )}
      </div>
      {percent != null && (
        <div
          className="ctrack"
          role="progressbar"
          aria-label={`Progress for ${d.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="cfill" style={{ width: `${percent}%` }} />
        </div>
      )}
    </li>
  );
}

// One deliverable on the Overview, written as a line of a report: the figure
// large, then what it counts against what was promised. Still one unit per
// line, never a total.
const deliveryNote = (done, target, percent) => {
  if (target <= 0) return '';
  if (done > target) return 'Target exceeded';
  if (done === target) return 'Target met';
  if (done === 0) return 'Not started';
  return `${percent}% of target`;
};

// One achieved target on the Overview: the figure first, then what it counts,
// then what was promised. One unit per tile, never a total.
function OutcomeTile({ d }) {
  const percent = deliverablePercent(d);
  const target = Number(d.targetCount) || 0;
  const done = Number(d.completedCount) || 0;
  const note = deliveryNote(done, target, percent);
  const met = target > 0 && done >= target;
  return (
    <li className="cout">
      <div className="cout-n">{formatCount(done)}</div>
      <div className="cout-t">{d.title}</div>
      {(target > 0 || note) && (
        <div className="cout-m">
          {target > 0 && <span>Target {formatCount(target)}</span>}
          {note && <span className={`ctag${met ? ' ok' : ''}`}>{note}</span>}
        </div>
      )}
      {percent != null && (
        <div
          className="ctrack"
          role="progressbar"
          aria-label={`Progress for ${d.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="cfill" style={{ width: `${percent}%` }} />
        </div>
      )}
    </li>
  );
}

// A target with no figure: what was promised, and why there is no number.
function MissedRow({ d, tagged }) {
  const target = Number(d.targetCount) || 0;
  return (
    <li className="cmiss">
      <span className="cmiss-t">{d.title}</span>
      {target > 0 && <span className="cmiss-s">Target {formatCount(target)}</span>}
      {tagged && <span className="ctag">{notDelivered(d) ? NOT_DELIVERED : NO_RESULT}</span>}
    </li>
  );
}

function IkfMark() {
  return (
    <span className="cikf">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="3" />
      </svg>
      Delivered by India Khelo Football
    </span>
  );
}

// The Overview's photos, organised the way a report would be: by month, then
// by activity, oldest first. Up to six activities (the latest with photos),
// four photos each; the rest open from "See all".
const FIELD_ACTIVITIES = 6;
const PHOTOS_PER_ACTIVITY = 4;
function overviewPhotoPicks(activities) {
  const withPhotos = latestFirst(activities, activityDate)
    .filter((a) => a.photos && a.photos.length)
    .slice(0, FIELD_ACTIVITIES)
    .reverse();
  return withPhotos.flatMap((a) => a.photos.slice(0, PHOTOS_PER_ACTIVITY).map((ph) => ({ a, ph })));
}

function useOverviewPhotos(activities, enabled, source) {
  const [urls, setUrls] = useState({});
  const picks = overviewPhotoPicks(activities);
  const key = picks.map(({ a, ph }) => `${a.id}:${ph.id}:${ph.version}`).join('|');

  useEffect(() => {
    if (!enabled || !key) return undefined;
    let active = true;
    const made = [];
    picks.forEach(({ a, ph }) => {
      source.activityPhoto(a.id, ph.id, ph.version)
        .then(({ blob }) => {
          if (!active) return;
          const url = URL.createObjectURL(blob);
          made.push(url);
          setUrls((u) => ({ ...u, [ph.id]: url }));
        })
        .catch(() => {});
    });
    return () => { active = false; made.forEach((u) => URL.revokeObjectURL(u)); setUrls({}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, source]);

  // Activity -> its loaded photos, then grouped by month, oldest first.
  const groups = [];
  picks.forEach(({ a, ph }) => {
    const url = urls[ph.id];
    if (!url) return;
    let group = groups.find((g) => g.a.id === a.id);
    if (!group) { group = { a, shots: [] }; groups.push(group); }
    group.shots.push({ ph, url });
  });
  const months = byMonth(groups, (g) => activityDate(g.a))
    .map((m) => ({ key: m.key, label: m.label, groups: m.items }));
  return { months };
}

const URL_RE = /(https?:\/\/[^\s]+)/g;

// A link as a reader wants it: the site and the page, without the tracking
// query ("instagram.com/p/DSWy4lpCHqU", not the full address).
const linkLabel = (href) => {
  try {
    const u = new URL(href);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`;
  } catch {
    return href;
  }
};

function LinkedText({ text, className }) {
  const parts = String(text).split(URL_RE);
  return (
    <div className={className}>
      {parts.map((part, i) => (i % 2 === 1
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" title={part}>{linkLabel(part)}</a>
        : part))}
    </div>
  );
}

// Every photo of one activity, fetched only once the funder asks for them.
function ActivityGallery({ activity, source, limit = null }) {
  const [urls, setUrls] = useState([]);
  const shown = limit ? activity.photos.slice(0, limit) : activity.photos;
  const key = shown.map((ph) => `${ph.id}:${ph.version}`).join('|');

  useEffect(() => {
    let active = true;
    const made = [];
    Promise.all(shown.map((ph) => source.activityPhoto(activity.id, ph.id, ph.version)
      .then(({ blob }) => {
        const url = URL.createObjectURL(blob);
        made.push(url);
        return { id: ph.id, url };
      })
      .catch(() => null)))
      .then((list) => { if (active) setUrls(list.filter(Boolean)); });
    return () => { active = false; made.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id, key, source]);

  if (urls.length === 0) return <p className="crow-s">Loading photos…</p>;
  return (
    <ul className="cgallery" aria-label={`Photos: ${activity.title}`}>
      {urls.map((u, i) => (
        <li key={u.id}>
          <a href={u.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${activity.title}, ${i + 1} of ${activity.photos.length}, full size`}>
            <img src={u.url} alt={`${activity.title}, ${i + 1} of ${activity.photos.length}`} />
          </a>
        </li>
      ))}
    </ul>
  );
}

// One colour per kind of activity, so a funder can tell a trial from a training
// at a glance. Known kinds get a fixed colour; any other kind a stable one.
const TYPE_TONES = [['promot', 0], ['trial', 1], ['train', 2], ['showcase', 3], ['assess', 4]];
const typeTone = (type) => {
  const t = String(type || '').toLowerCase();
  const known = TYPE_TONES.find(([word]) => t.includes(word));
  if (known) return known[1];
  let h = 0;
  for (let i = 0; i < t.length; i += 1) h = (h * 31 + t.charCodeAt(i)) % 997;
  return 5 + (h % 2);
};

function EmptyPanel({ title, children }) {
  return (
    <div className="cpanel">
      <div className="cempty">
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export default function ClientPortalPage({ source = funderSource, preview = null }) {
  const { logout } = useAuth();
  const [allProjects, setAllProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [reports, setReports] = useState([]);
  const [fileBusy, setFileBusy] = useState(null);
  const [fileErrors, setFileErrors] = useState({});
  const [deliverables, setDeliverables] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [athleteFilter, setAthleteFilter] = useState('all');
  const [fyMenuAnchor, setFyMenuAnchor] = useState(null);
  const [photosOpen, setPhotosOpen] = useState(null);

  const [brand, setBrand] = useState(null);
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [noGrant, setNoGrant] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [certAttempt, setCertAttempt] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [tab, setTab] = useState(tabFromHash);
  const [pwOpen, setPwOpen] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const tabRefs = useRef({});

  const loadSeq = useRef(0);
  const certSeq = useRef(0);
  const mounted = useRef(true);
  const selectedProjectIdRef = useRef(selectedProjectId);

  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  const delivered = activities.filter((a) => a.status === 'Completed');
  const upcoming = activities.filter((a) => a.status === 'Planned' && !a.datePassed);
  const awaiting = activities.filter((a) => a.status === 'Planned' && a.datePassed);
  const cancelled = activities.filter((a) => a.status === 'Cancelled');
  const activityCount = formatActivityCount(delivered.length, upcoming.length, {
    awaiting: awaiting.length, cancelled: cancelled.length,
  });
  const photos = useOverviewPhotos(delivered, tab === 'project', source);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const applyData = useCallback((d, preserveProjects = false) => {
    if (!preserveProjects && d.projects) {
      setAllProjects(d.projects);
    }
    if (d.project) {
      setProject(d.project);
      if (!selectedProjectIdRef.current) {
        setSelectedProjectId(d.project.id);
      }
    }
    setActivities(d.activities || []);
    setReports(d.reports || []);
    setDeliverables(d.deliverables || []);
    setAthletes(d.athletes || []);
    setUpdatedAt(new Date());
  }, []);

  // Project switch handler for multi-year selection — does NOT re-fetch projects catalog!
  const handleSelectProject = useCallback(async (pid) => {
    if (!pid || pid === selectedProjectIdRef.current) return;
    selectedProjectIdRef.current = pid;
    setSelectedProjectId(pid);
    const matched = allProjects.find((p) => p.id === pid);
    if (matched) {
      setProject(matched);
    }
    setAthleteSearch(''); // Reset athlete search filter for the newly selected project
    const seq = ++loadSeq.current;
    const current = () => mounted.current && seq === loadSeq.current;
    setLoading(true);
    try {
      source.branding(pid)
        .then((b) => { if (current()) setBrand(b && b.slug ? b : null); })
        .catch(() => {});
      const d = await source.data(pid, true);
      if (!current()) return;
      applyData({ ...d, project: matched || d.project }, true);
      setFailed(false);
      setNoGrant(false);
    } catch (e) {
      if (!current()) return;
      if (isNoGrant(e)) setNoGrant(true);
      else setFailed(true);
    } finally {
      if (current()) setLoading(false);
    }

    const cseq = ++certSeq.current;
    setCert(null);
    source.certificate(pid)
      .then((c) => { if (mounted.current && cseq === certSeq.current) setCert(c); })
      .catch(() => { if (mounted.current && cseq === certSeq.current) setCert({ available: false, reason: 'error' }); });
  }, [source, applyData, allProjects]);
  const selectProjectRef = useRef(handleSelectProject);
  selectProjectRef.current = handleSelectProject;

  useEffect(() => {
    let active = true;
    const seq = ++loadSeq.current;
    const current = () => active && seq === loadSeq.current;
    setLoading(true);
    setFailed(false);
    setNoGrant(false);
    (async () => {
      try {
        const pid = selectedProjectId;
        source.branding(pid)
          .then((b) => { if (current()) setBrand(b && b.slug ? b : null); })
          .catch(() => {});

        // Initial mount loads projects list
        const firstOpen = !selectedProjectIdRef.current;
        const d = await source.data(pid, true);
        if (!current()) return;
        applyData(d);
        // D-027: a grant with nothing delivered yet opens on the latest earlier
        // year instead, so the funder does not land on an empty page. The list
        // puts the login's own grant first and the rest newest first.
        const nothingYet = !d.activities?.length && !d.athletes?.length && !d.deliverables?.length;
        if (firstOpen && nothingYet && d.projects?.length > 1) {
          selectProjectRef.current(d.projects[1].id);
        }
      } catch (e) {
        if (!current()) return;
        if (isNoGrant(e)) setNoGrant(true);
        else setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [attempt, source, applyData]);

  useEffect(() => {
    let active = true;
    const seq = ++certSeq.current;
    const current = () => active && seq === certSeq.current;
    setCert(null);
    source.certificate(selectedProjectId)
      .then((c) => { if (current()) setCert(c); })
      .catch(() => { if (current()) setCert({ available: false, reason: 'error' }); });
    return () => { active = false; };
  }, [attempt, certAttempt, source]);

  useRefetchOnFocus(() => {
    if (loading) return;
    const pid = selectedProjectIdRef.current;
    const seq = ++loadSeq.current;
    const current = () => mounted.current && seq === loadSeq.current;
    source.branding(pid)
      .then((b) => { if (current()) setBrand(b && b.slug ? b : null); })
      .catch(() => {});
    // The grant list comes back too, so a changed status, amount or period shows
    // without a reload; the funder stays on the year they picked.
    source.data(pid, true)
      .then((d) => {
        if (!current()) return;
        const keep = selectedProjectIdRef.current;
        const fresh = (keep && d.projects?.find((p) => p.id === keep)) || d.project;
        applyData({ ...d, project: fresh });
        setFailed(false);
        setNoGrant(false);
      })
      .catch(() => {});
    const cseq = ++certSeq.current;
    source.certificate(pid)
      .then((c) => { if (mounted.current && cseq === certSeq.current) setCert(c); })
      .catch(() => {});
  });

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const title = brand?.displayName || project?.name || 'CSR Portal';

  useEffect(() => {
    const previous = document.title;
    const name = brand?.displayName || project?.name;
    document.title = name ? `${name} · CSR Portal` : 'CSR Portal';
    return () => { document.title = previous; };
  }, [brand?.displayName, project?.name]);

  useEffect(() => {
    tabRefs.current[tab]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [tab, loading]);

  const selectTab = useCallback((key) => {
    setTab(key);
    if (window.location.hash !== `#${key}`) window.location.hash = key;
  }, []);

  const onTabKeyDown = (e) => {
    const i = TAB_KEYS.indexOf(tab);
    let next = null;
    if (e.key === 'ArrowRight') next = TAB_KEYS[(i + 1) % TAB_KEYS.length];
    else if (e.key === 'ArrowLeft') next = TAB_KEYS[(i - 1 + TAB_KEYS.length) % TAB_KEYS.length];
    else if (e.key === 'Home') next = TAB_KEYS[0];
    else if (e.key === 'End') next = TAB_KEYS[TAB_KEYS.length - 1];
    if (!next) return;
    e.preventDefault();
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  const cssVars = brandCssVars(brand?.primaryColor);
  const closed = project?.status === 'Closed';
  const counts = {
    activities: activityCount,
    reports: reports.length,
    deliverables: deliverables.length,
    athletes: athletes.length,
  };

  // Group projects by Financial Year
  const fyGroups = useMemo(() => {
    const map = new Map();
    (allProjects || []).forEach((p) => {
      const fy = getProjectFY(p);
      if (!map.has(fy)) map.set(fy, []);
      map.get(fy).push(p);
    });
    return Array.from(map.entries())
      .map(([fy, prjs]) => ({
        fy,
        projects: prjs.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')),
      }))
      .sort((a, b) => b.fy.localeCompare(a.fy));
  }, [allProjects]);

  const currentFY = project ? getProjectFY(project) : (fyGroups[0]?.fy || 'General');
  const topFYs = fyGroups.slice(0, 3);
  const moreFYs = fyGroups.slice(3);
  const projectsInActiveFY = fyGroups.find((g) => g.fy === currentFY)?.projects || [];

  const renderProject = () => {
    const progress = grantProgress(project.startDate, project.endDate);
    const months = monthStrip(project.startDate, project.endDate, delivered);
    const places = placesReached(delivered);
    const recent = latestFirst(delivered, activityDate).slice(0, 3);
    const recentReports = latestFirst(reports, reportDate).slice(0, 3);
    const n = delivered.length;
    const achieved = deliverables.filter(hasResult);
    const missed = deliverables.filter((d) => !hasResult(d));
    const allNotDelivered = missed.length > 0 && missed.every(notDelivered);
    const dayFact = !progress ? null
      : progress.state === 'running' ? `Day ${formatCount(progress.day)} of ${formatCount(progress.total)}`
        : progress.state === 'upcoming' ? `Starts ${formatDate(project.startDate)}`
          : `Ended ${formatDate(project.endDate)}`;

    // Realistic athlete count: check athletes list, then project deliverable count, fallback to 0 (no hardcoded 840)
    const athleteDisplayCount = athletes.length > 0
      ? formatCount(athletes.length)
      : (project.athletesCount != null ? formatCount(project.athletesCount) : '0');

    return (
      <article className="creport">

        {/* 4 Summary Stat Cards */}
        <div className="cstat-grid">
          <div className="cstat-card">
            <div className="cstat-lbl">Total Grant Amount</div>
            <div className="cstat-val cnum">{formatRupees(project.sanctionedAmount)}</div>
            <div className="cstat-sub">
              <span className="cpill ok">Sanctioned</span>
              {project.season && <span className="cstat-tag">{project.season}</span>}
            </div>
          </div>

          <div className="cstat-card">
            <div className="cstat-lbl">Athletes Scouted</div>
            <div className="cstat-val cnum">{athleteDisplayCount}</div>
            <div className="cstat-sub">
              {project.cities?.length > 0 ? `Across ${project.cities.length} target cities` : 'Registered in programme'}
            </div>
          </div>

          {project.cities?.length > 0 && (
          <div className="cstat-card">
            <div className="cstat-lbl">Target Cities</div>
            <div className="cstat-val cnum">{project.cities?.length || 0}</div>
            <div className="cstat-sub cstat-ellipsis">
              {project.cities?.length > 0
                ? project.cities.map((c) => c.name || c.cityName || c.cityCode).join(', ')
                : 'No cities assigned'}
            </div>
          </div>
          )}

          <div className="cstat-card">
            <div className="cstat-lbl">Audit &amp; Certification</div>
            <div className="cstat-val cstat-val-sm">
              {cert?.available ? 'Certified' : closed ? 'Closing' : 'In Progress'}
            </div>
            <div className="cstat-sub">
              {cert?.available ? (
                <button
                  type="button"
                  className="cbtn-link"
                  onClick={() => downloadCertificate(cert)}
                >
                  Download PDF
                </button>
              ) : (
                <button
                  type="button"
                  className="cbtn-link"
                  onClick={() => selectTab('certificate')}
                >
                  View Status →
                </button>
              )}
            </div>
          </div>
        </div>


        <section aria-labelledby="cp-delivered">
          <h2 className="csec" id="cp-delivered">What has been delivered</h2>
          {deliverables.length === 0 ? (
            <p className="clede">
              {n > 0
                ? closed
                  ? `${formatCount(n)} activit${n === 1 ? 'y' : 'ies'} took place under this grant.`
                  : `${formatCount(n)} activit${n === 1 ? 'y has' : 'ies have'} taken place so far. The targets this grant commits to will be set out here, each against what has been delivered.`
                : closed
                  ? 'This grant has closed. Nothing was recorded against it.'
                  : 'Nothing has been recorded against this grant yet. Activities and delivery progress appear here as they happen.'}
            </p>
          ) : (
            <>
              {achieved.length > 0 && (
                <ul className="couts">
                  {achieved.map((d) => <OutcomeTile key={d.id} d={d} />)}
                </ul>
              )}
              {missed.length > 0 && (
                <>
                  {allNotDelivered && <h3 className="csub">Not delivered</h3>}
                  <ul className="cmisses">
                    {missed.map((d) => <MissedRow key={d.id} d={d} tagged={!allNotDelivered} />)}
                  </ul>
                </>
              )}
            </>
          )}
        </section>

        {(months.length > 0 || places.length > 0) && (
          <section aria-labelledby="cp-where">
            <h2 className="csec" id="cp-where">Where and when</h2>
            {months.length > 0 && (
              <ol className="cmonths" aria-label="Activities by month">
                {months.map((m) => (
                  <li key={m.key} className={`cmo ${m.state}`}>
                    <span className="cmo-m">{m.label}<span className="cmo-y"> {m.year}</span></span>
                    <span className="cmo-bars" aria-hidden="true">
                      {Array.from({ length: Math.min(m.count, 6) }, (_, i) => <i key={i} />)}
                    </span>
                    <span className="cmo-c">
                      {m.count > 0
                        ? `${formatCount(m.count)} held`
                        : m.state === 'ahead' ? 'Ahead' : 'None'}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {places.length > 0 && (
              <ul className="cplaces" aria-label="Places reached">
                {places.map((pl) => (
                  <li key={pl.name} className="cplace">
                    <span className="cplace-n">{pl.name}</span>
                    <span className="cplace-c cnum">{formatCount(pl.count)}</span>
                    <span className="cplace-s">
                      {pl.count === 1 ? '1 activity' : `${formatCount(pl.count)} activities`}
                      {pl.latest ? ` · latest ${formatDate(pl.latest)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {photos.months.length > 0 ? (
          <section aria-labelledby="cp-field">
            <h2 className="csec" id="cp-field">From the field</h2>
            {photos.months.map((m) => (
              <div className="cfield-m" key={m.key}>
                <h3 className="csub">{m.label}</h3>
                {m.groups.map(({ a, shots }) => (
                  <div className="cfield-a" key={a.id}>
                    <div className="cfield-h">
                      <span className="cfield-t">{a.title}</span>
                      <span className="cfield-s">
                        {[formatDate(activityDate(a)), `${formatCount(a.photos.length)} photos`].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <ul className="cgrid" aria-label={`Photos from ${a.title}`}>
                      {shots.map(({ ph, url }, k) => (
                        <li key={ph.id}>
                          <img src={url} alt={`${a.title}, ${k + 1} of ${a.photos.length}`} />
                        </li>
                      ))}
                    </ul>
                    {a.photos.length > shots.length && (
                      <button
                        type="button" className="cmore"
                        onClick={() => { setPhotosOpen(a.id); selectTab('activities'); }}
                      >
                        See all {formatCount(a.photos.length)} photos
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <button type="button" className="cmore" onClick={() => selectTab('activities')}>
              All activities ({activityCount})
            </button>
          </section>
        ) : recent.length > 0 && (
          <section aria-labelledby="cp-field">
            <h2 className="csec" id="cp-field">From the field</h2>
            <ul className="citems">
              {recent.map((a) => {
                const when = (a.startDate || a.endDate) ? formatRange(a.startDate, a.endDate) : formatDate(a.date);
                const meta = [a.activityType, activityPlace(a), when].filter(Boolean).join(' · ');
                return (
                  <li key={a.id} className="citem">
                    <span className="citem-t">{a.title}</span>
                    {meta && <span className="citem-s">{meta}</span>}
                  </li>
                );
              })}
            </ul>
            {activities.length > recent.length && (
              <button type="button" className="cmore" onClick={() => selectTab('activities')}>
                All activities ({activityCount})
              </button>
            )}
          </section>
        )}

        <section aria-labelledby="cp-details">
          <h2 className="csec" id="cp-details">Programme details</h2>
          <dl className="cline">
            <div><dt>Funder</dt><dd>{project.clientName || 'Not recorded'}</dd></div>
            <div><dt>Sanctioned</dt><dd className="cnum">{formatRupees(project.sanctionedAmount)}</dd></div>
            <div><dt>Period</dt><dd>{formatRange(project.startDate, project.endDate) || 'Not set'}</dd></div>
            {project.fundsReceivedOn && (
              <div><dt>Received</dt><dd className="cnum">{formatDate(project.fundsReceivedOn)}</dd></div>
            )}
            <div><dt>Status</dt><dd>{project.status || 'Not recorded'}</dd></div>
            {dayFact && <div><dt>Progress</dt><dd className="cnum">{dayFact}</dd></div>}
            {project.cities?.length > 0 && (
              <div><dt>Cities</dt><dd>{project.cities.map((c) => c.name).join(', ')}</dd></div>
            )}
          </dl>
          {project.description && <p className="cdek cdek-in">{project.description}</p>}
        </section>

        {recentReports.length > 0 && (
          <section aria-labelledby="cp-reports">
            <h2 className="csec" id="cp-reports">Latest reports</h2>
            <ul className="citems">
              {recentReports.map((r) => {
                const name = (r.title && String(r.title).trim()) || r.fileName || 'Report';
                const meta = [r.reportType, r.documentDate || formatDate(r.createdAt)].filter(Boolean).join(' · ');
                return (
                  <li key={r.id} className="citem citem-row">
                    <span className="citem-main">
                      <span className="citem-t">{name}</span>
                      {meta && <span className="citem-s">{meta}</span>}
                    </span>
                    {r.hasFile ? (
                      <button
                        type="button"
                        className="cbtn"
                        aria-label={`Open ${name}`}
                        onClick={() => openUploadedReport(r, name)}
                        disabled={fileBusy === r.id}
                      >
                        {fileBusy === r.id ? 'Opening…' : 'Open'}
                      </button>
                    ) : r.fileUrl ? (
                      <a className="cbtn" href={r.fileUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name}`}>
                        Open
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {reports.length > recentReports.length && (
              <button type="button" className="cmore" onClick={() => selectTab('reports')}>
                All {formatCount(reports.length)} reports
              </button>
            )}
          </section>
        )}

        <footer className="csign">
          <IkfMark />
          {project.clientName && <span>Prepared for {project.clientName}</span>}
        </footer>
      </article>
    );
  };

  const activityRow = (a) => {
    const when = (a.startDate || a.endDate)
      ? formatRange(a.startDate, a.endDate)
      : formatDate(a.date);
    const photoCount = a.status === 'Completed' && a.photos ? a.photos.length : 0;
    const open = photosOpen === a.id;
    const tone = `ctone-${typeTone(a.activityType)}`;
    const placeAndWhen = [when, activityPlace(a)].filter(Boolean).join(' · ');
    return (
      <li className={`crow ${tone}`} key={a.id}>
        <div className="crow-main">
          {a.activityType && <span className="ctype">{a.activityType}</span>}
          <div className="crow-t">{a.title}</div>
          {placeAndWhen && <div className="crow-s">{placeAndWhen}</div>}
          {a.description && <LinkedText className="crow-d" text={a.description} />}
          {photoCount > 0 && (
            <>
              <ActivityGallery activity={a} source={source} limit={open ? null : 4} />
              {photoCount > 4 && (
                <button
                  type="button" className="cbtn crow-photos" aria-expanded={open}
                  onClick={() => setPhotosOpen(open ? null : a.id)}
                >
                  {open ? 'Show fewer photos' : `See all ${formatCount(photoCount)} photos`}
                </button>
              )}
            </>
          )}
        </div>
        {a.status && (
          <div className="crow-end">
            <span className={`cpill${a.status === 'Completed' ? ' ok' : ''}`}>{a.status}</span>
          </div>
        )}
      </li>
    );
  };

  const activityGroups = [
    { key: 'upcoming', heading: 'Upcoming', list: upcoming },
    { key: 'awaiting', heading: 'Awaiting update', list: awaiting },
    { key: 'delivered', heading: 'Delivered', list: delivered },
    { key: 'cancelled', heading: 'Cancelled', list: cancelled },
  ].filter((g) => g.list.length > 0);

  const renderActivities = () => (
    activityGroups.length === 0 ? (
      <EmptyPanel>
        {closed
          ? 'No activities were published under this grant.'
          : 'Nothing published yet. Trials, workshops and training sessions under this grant appear here, both those coming up and those delivered.'}
      </EmptyPanel>
    ) : (
      activityGroups.map((g) => (
        <section className="cpanel cpanel-open" aria-labelledby={`cp-acts-${g.key}`} key={g.key}>
          <h2 className="csec" id={`cp-acts-${g.key}`}>{g.heading}</h2>
          {byMonth(g.list, activityDate).map((m) => (
            <div className="cmonth" key={m.key}>
              <h3 className="csub">{m.label}</h3>
              <ul className="crows ccards">
                {m.items.map(activityRow)}
              </ul>
            </div>
          ))}
        </section>
      ))
    )
  );

  // Maps the stored status ('Participated', 'Shortlisted', 'Scholarship Awarded',
  // 'National Finals') to its filter bucket.
  const getStatusCategory = (ath) => {
    const raw = (ath.status || ath.selectionStatus || '').toLowerCase();
    if (raw.includes('final') || raw.includes('national')) return 'national_finals';
    if (raw.includes('scholarship')) return 'scholarship_awarded';
    if (raw.includes('shortlist')) return 'shortlisted';
    return 'participated';
  };

  const getStatusLabel = (ath) => {
    return ath.status || ath.selectionStatus || 'Participated';
  };

  const renderAthletes = () => {
    const q = (athleteSearch || '').trim().toLowerCase();
    const filtered = (athletes || []).filter((ath) => {
      const cat = getStatusCategory(ath);
      const matchFilter = athleteFilter === 'all' || cat === athleteFilter;
      if (!matchFilter) return false;
      if (!q) return true;
      const name = (ath.fullName || '').toLowerCase();
      const pos = (ath.position || '').toLowerCase();
      const category = (ath.category || '').toLowerCase();
      const st = getStatusLabel(ath).toLowerCase();
      return name.includes(q) || pos.includes(q) || category.includes(q) || st.includes(q);
    });

    const countsStatus = {
      all: athletes.length,
      participated: athletes.filter((a) => getStatusCategory(a) === 'participated').length,
      shortlisted: athletes.filter((a) => getStatusCategory(a) === 'shortlisted').length,
      scholarship: athletes.filter((a) => getStatusCategory(a) === 'scholarship_awarded').length,
      finals: athletes.filter((a) => getStatusCategory(a) === 'national_finals').length,
    };

    const filterOptions = [
      { id: 'all', label: `All (${countsStatus.all})` },
      { id: 'participated', label: `Participated (${countsStatus.participated})` },
      { id: 'shortlisted', label: `Shortlisted (${countsStatus.shortlisted})` },
      { id: 'scholarship_awarded', label: `Scholarship Awarded (${countsStatus.scholarship})` },
      { id: 'national_finals', label: `National Finals (${countsStatus.finals})` },
    ];

    return (
      <section className="cpanel" aria-label="Athletes">
        <div className="chead">
          <div>
            <h2 className="ctitle">Athletes Scouted ({formatCount(athletes.length)})</h2>
            <div className="crow-s">
              Beneficiaries and scouted players from trials under {project?.name || 'this grant'}
            </div>
          </div>
        </div>

        <div className="cathlete-filter-bar">
          <input
            type="search"
            className="csearch-input"
            placeholder="Search by name, position, category, status…"
            value={athleteSearch}
            onChange={(e) => setAthleteSearch(e.target.value)}
            aria-label="Search athletes"
          />
          <div className="cfilter-pills" role="group" aria-label="Filter by status">
            {filterOptions.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`cfilter-pill${athleteFilter === f.id ? ' on' : ''}`}
                onClick={() => setAthleteFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {athletes.length === 0 ? (
          <EmptyPanel>
            {closed
              ? 'No athletes were scouted or registered under this grant.'
              : 'No athletes recorded yet. Players scouted during trials and talent hunts will be profiled here.'}
          </EmptyPanel>
        ) : filtered.length === 0 ? (
          <EmptyPanel>
            No athletes match your search or filter.
          </EmptyPanel>
        ) : (
          <div className="cathletes-table-wrap">
            <table className="cathletes-table">
              <thead>
                <tr>
                  <th scope="col">Athlete Name</th>
                  <th scope="col">Position</th>
                  <th scope="col">Category</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ath) => {
                  const statusCat = getStatusCategory(ath);
                  const statusClass = (statusCat === 'scholarship_awarded' || statusCat === 'national_finals') ? ' ok'
                    : statusCat === 'shortlisted' ? ' warn' : '';
                  return (
                    <tr key={ath.id}>
                      <td>
                        <div className="cath-name">
                          <strong>{ath.fullName}</strong>
                        </div>
                      </td>
                      <td>
                        {ath.position ? (
                          <span className="cpos-badge">{ath.position}</span>
                        ) : '—'}
                      </td>
                      <td>
                        {ath.category ? (
                          <span className="cpos-badge">{ath.category}</span>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`cpill${statusClass}`}>
                          {getStatusLabel(ath)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const openUploadedReport = async (r, name) => {
    if (fileBusy) return;
    setFileBusy(r.id);
    setFileErrors((prev) => ({ ...prev, [r.id]: '' }));
    try {
      openDownloadedFile(await source.reportFile(r.id), name);
    } catch {
      setFileErrors((prev) => ({ ...prev, [r.id]: 'The file could not be opened. Please try again.' }));
    } finally {
      setFileBusy(null);
    }
  };

  const renderReports = () => (
    reports.length === 0 ? (
      <EmptyPanel>
        {closed
          ? 'No reports were released under this grant.'
          : 'No reports released yet. The India Khelo Football team publishes a report for an activity once it is written; you will see it here as soon as it is released.'}
      </EmptyPanel>
    ) : (
      <section className="cpanel cpanel-open" aria-label="Reports">
        <ul className="crows ccards">
          {byMonth(reports, reportDate).flatMap((m) => m.items).map((r) => {
            const name = (r.title && String(r.title).trim()) || r.fileName || 'Report';
            const meta = [r.reportType, r.documentDate || formatDate(r.createdAt)].filter(Boolean).join(' · ');
            return (
              <li className="crow" key={r.id}>
                <div className="crow-main">
                  <div className="crow-t">
                    {r.hasFile ? (
                      <button type="button" className="crow-tbtn" onClick={() => openUploadedReport(r, name)}>
                        {name}
                      </button>
                    ) : r.fileUrl ? (
                      <a href={r.fileUrl} target="_blank" rel="noopener noreferrer">{name}</a>
                    ) : name}
                  </div>
                  {meta && <div className="crow-s">{meta}</div>}
                </div>
                <div className="crow-end">
                  {r.hasFile ? (
                    <button
                      type="button"
                      className="cbtn"
                      aria-label={`Open ${name}`}
                      onClick={() => openUploadedReport(r, name)}
                      disabled={fileBusy === r.id}
                    >
                      {fileBusy === r.id ? 'Opening…' : 'Open'}
                    </button>
                  ) : r.fileUrl ? (
                    <a
                      className="cbtn"
                      href={r.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${name}`}
                    >
                      Open
                    </a>
                  ) : (
                    <span className="crow-s">File not attached yet</span>
                  )}
                  {fileErrors[r.id] ? (
                    <span className="crow-s crow-err" role="alert">{fileErrors[r.id]}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    )
  );

  const renderDeliverables = () => (
    deliverables.length === 0 ? (
      <EmptyPanel>
        {closed
          ? 'No deliverables were recorded under this grant.'
          : 'No deliverables recorded yet. What this grant promises, and how much of it has been delivered, will be tracked here.'}
      </EmptyPanel>
    ) : (
      <section className="cpanel cpanel-open" aria-label="Deliverables">
        {byMonth(deliverables, (d) => d.dueDate).map((m) => (
          <div className="cmonth" key={m.key}>
            <h3 className="csub">{m.key ? `Due ${m.label}` : 'No due date'}</h3>
            <ul className="crows ccards">
              {m.items.map((d) => <DeliverableRow key={d.id} d={d} detailed />)}
            </ul>
          </div>
        ))}
      </section>
    )
  );

  // D-030: the budget the grant agreed, shown above the certificate so the
  // funder reads what was planned before what was spent.
  const renderBudget = () => {
    const rows = project?.agreedBudget || [];
    if (rows.length === 0) return null;
    const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    return (
      <section className="cpanel cbudget" aria-labelledby="cp-budget">
        <h2 className="ctitle" id="cp-budget">Agreed budget</h2>
        <div className="crow-s">As set out when the grant was agreed.</div>
        <ul className="crows clines">
          {rows.map((r, i) => (
            <li className="crow" key={i}>
              <div className="crow-main"><div className="crow-t">{r.head}</div></div>
              <div className="crow-end cnum">{formatRupees(r.amount)}</div>
            </li>
          ))}
          <li className="crow ctotal">
            <div className="crow-main"><div className="crow-t">Total</div></div>
            <div className="crow-end cnum">{formatRupees(total)}</div>
          </li>
        </ul>
      </section>
    );
  };

  const renderCertificate = () => (
    <>
      {renderBudget()}
      {renderCertificateBody()}
    </>
  );

  const renderCertificateBody = () => {
    if (!cert) {
      return <div className="cloading"><CircularProgress size={24} /></div>;
    }
    if (!cert.available) {
      if (cert.reason === 'error') {
        return (
          <div className="cpanel" role="alert">
            <div className="cempty">
              The certificate could not be loaded just now. This is usually brief.
              <div className="cempty-act">
                <Button variant="contained" onClick={() => setCertAttempt((n) => n + 1)}>
                  Try again
                </Button>
              </div>
            </div>
          </div>
        );
      }
      const closesOn = formatDate(cert.endDate);
      return (
        <EmptyPanel>
          {`Your utilisation certificate is issued when this grant closes${closesOn ? `, on ${closesOn}` : ''}. Until then expenses are still being allocated against your contribution, so the figures would keep changing after you filed them. The grant is currently ${cert.projectStatus || project?.status || 'open'}.`}
        </EmptyPanel>
      );
    }
    const frozenOn = formatDate(cert.frozenAt);
    const start = formatDate(cert.periodStart) || 'Inception';
    const end = formatDate(cert.periodEnd);
    const lines = cert.lineItems || [];
    // 27 Oct, owner: a CA certificate gives one period for every head, so each
    // line carries the same date; shown once above the list, it no longer reads
    // as if everything was spent on that one day.
    const sharedDate = lines.length > 1 && lines.every((x) => x.date && x.date === lines[0].date)
      ? formatDate(lines[0].date)
      : '';
    return (
      <section className="cpanel" aria-labelledby="cp-cert">
        <div className="chead">
          <div>
            <h2 className="ctitle" id="cp-cert">Utilisation Certificate</h2>
            <div className="crow-s">
              Version {cert.certificateVersion} · figures fixed
              {frozenOn ? ` on ${frozenOn}` : ' at project close'}
            </div>
          </div>
          <Button
            className="cnoprint"
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => downloadCertificate(cert)}
          >
            Download PDF
          </Button>
        </div>

        <dl className="cfacts">
          {cert.utilisationType && (
            <div className="cfact">
              <dt className="cfact-k">Certificate type</dt>
              <dd className="cfact-v">{cert.utilisationType}</dd>
            </div>
          )}
          <div className="cfact">
            <dt className="cfact-k">Contribution</dt>
            <dd className="cfact-v cnum">{formatRupees(cert.sanctionedAmount)}</dd>
          </div>
          <div className="cfact">
            <dt className="cfact-k">Total utilised</dt>
            <dd className="cfact-v cnum">{formatRupees(cert.totalUtilised)}</dd>
          </div>
          <div className="cfact">
            <dt className="cfact-k">Period</dt>
            <dd className="cfact-v">{end ? `${start} – ${end}` : `${start} to date`}</dd>
          </div>
        </dl>

        {lines.length > 0 && (project?.agreedBudget || []).length > 0 && (
          <h3 className="csub">Spent, by head</h3>
        )}
        {lines.length === 0 ? (
          <p className="clede cdesc">No expenses are recorded against this grant.</p>
        ) : (
          <>
            {sharedDate && <p className="crow-s">Spent up to {sharedDate}</p>}
            <ul className="crows clines">
              {lines.map((x, i) => {
                const on = sharedDate ? '' : formatDate(x.date);
                return (
                  <li className="crow" key={i}>
                    <div className="crow-main">
                      <div className="crow-t">{x.note || 'Expense'}</div>
                      {on && <div className="crow-s">{on}</div>}
                    </div>
                    <div className="crow-end cnum">{formatRupees(x.amount)}</div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    );
  };

  const PANELS = {
    project: renderProject,
    activities: renderActivities,
    athletes: renderAthletes,
    reports: renderReports,
    deliverables: renderDeliverables,
    certificate: renderCertificate,
  };

  let body;
  if (loading) {
    body = <div className="cloading"><CircularProgress /></div>;
  } else if (failed) {
    body = (
      <div className="cpanel" role="alert">
        <div className="cempty">
          <strong>We couldn&rsquo;t load your grant just now.</strong>
          This is usually brief. Try again in a moment.
          <div className="cempty-act">
            <Button variant="contained" onClick={() => setAttempt((n) => n + 1)}>Retry</Button>
          </div>
        </div>
      </div>
    );
  } else if (noGrant || !project) {
    body = (
      <EmptyPanel title="No grant is linked to your account yet.">
        Ask your India Khelo Football programme contact to link it.
      </EmptyPanel>
    );
  } else {
    body = (
      <>
        {project.clientName && (
          <div className="ceyebrow">Programme report for {project.clientName} · {formatUpdated(updatedAt)}</div>
        )}
        <h1 className="cgrant">{project.name || title}</h1>

        {/* Multi-Year Segmented Control + Project Switcher */}
        {fyGroups.length > 0 && (
          <div className="cfy-switcher">
            <div className="cfy-bar" role="tablist" aria-label="Financial Year">
              {topFYs.map(({ fy, projects: prjs }) => {
                const isCurrentFY = currentFY === fy;
                return (
                  <button
                    key={fy}
                    type="button"
                    className={`cfy-pill${isCurrentFY ? ' on' : ''}`}
                    onClick={() => {
                      if (!isCurrentFY && prjs[0]) {
                        handleSelectProject(prjs[0].id);
                      }
                    }}
                    aria-selected={isCurrentFY}
                  >
                    {fy}
                  </button>
                );
              })}
              {moreFYs.length > 0 && (
                <>
                  <button
                    type="button"
                    className={`cfy-pill cfy-more${moreFYs.some((g) => g.fy === currentFY) ? ' on' : ''}`}
                    onClick={(e) => setFyMenuAnchor(e.currentTarget)}
                    aria-haspopup="true"
                  >
                    {moreFYs.some((g) => g.fy === currentFY) ? currentFY : 'Past Years ▾'}
                  </button>
                  <Menu
                    anchorEl={fyMenuAnchor}
                    open={!!fyMenuAnchor}
                    onClose={() => setFyMenuAnchor(null)}
                  >
                    {moreFYs.map(({ fy, projects: prjs }) => (
                      <MenuItem
                        key={fy}
                        selected={currentFY === fy}
                        onClick={() => {
                          setFyMenuAnchor(null);
                          if (prjs[0]) handleSelectProject(prjs[0].id);
                        }}
                      >
                        {fy} ({prjs.length} project{prjs.length === 1 ? '' : 's'})
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </div>

            {/* Project sub-chips when current FY has multiple projects */}
            {projectsInActiveFY.length > 1 && (
              <div className="cproj-chips" role="group" aria-label="Projects in this Financial Year">
                {projectsInActiveFY.map((p) => {
                  const isSelected = p.id === project?.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`cproj-chip${isSelected ? ' on' : ''}`}
                      onClick={() => handleSelectProject(p.id)}
                    >
                      {p.season ? `${p.season}: ` : ''}{p.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="ctabs" role="tablist" aria-label="Your grant" onKeyDown={onTabKeyDown}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              ref={(el) => { tabRefs.current[key] = el; }}
              type="button"
              role="tab"
              id={`ctab-${key}`}
              aria-controls={`cpanel-${key}`}
              aria-selected={tab === key}
              tabIndex={tab === key ? 0 : -1}
              className={`ctab${tab === key ? ' on' : ''}`}
              onClick={() => selectTab(key)}
            >
              {label(counts)}
            </button>
          ))}
        </div>

        {TABS.map(({ key }) => (
          <div
            key={key}
            role="tabpanel"
            id={`cpanel-${key}`}
            aria-labelledby={`ctab-${key}`}
            hidden={tab !== key}
            tabIndex={0}
            className="ctabpanel"
          >
            {tab === key && PANELS[key]()}
          </div>
        ))}
      </>
    );
  }

  // Keeps the funder's door before the session is cleared, then lets the route
  // decide: signed out, /client renders ClientSignedOut, which opens the branded login.
  // No redirect here, so a funder is never sent to the staff /csr/login.
  const handleSignOut = () => {
    try {
      const slug = brand?.slug || localStorage.getItem('tta_client_slug');
      if (slug) localStorage.setItem('tta_client_slug', slug);
    } catch {
      // storage blocked: the signed-out page still offers the way back
    }
    logout();
  };

  return (
    <ThemeProvider theme={clientThemeFrom(brand)}>
      <div className="cportal" style={cssVars || undefined}>
        <header className="cbar">
          <div className="cbar-id">
            {brand?.logoUrl && !logoBroken && (
              <img
                className="cbar-logo"
                src={brand.logoUrl}
                alt=""
                onError={() => setLogoBroken(true)}
              />
            )}
            <span className="cbar-name">{brand?.displayName || project?.clientName || title}</span>
          </div>
          <span className="cbar-ikf"><IkfMark /></span>
          {!preview && (
            <>
              <div className="cbar-actions">
                <Button className="cbar-btn" onClick={() => setPwOpen(true)}>Change password</Button>
                <Button className="cbar-btn" onClick={handleSignOut}>Sign out</Button>
              </div>
              <div className="cbar-menu">
                <IconButton
                  aria-label="Account menu"
                  aria-haspopup="true"
                  aria-expanded={menuAnchor ? 'true' : undefined}
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                >
                  <MenuIcon />
                </IconButton>
                <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                  <MenuItem onClick={() => { setMenuAnchor(null); setPwOpen(true); }}>Change password</MenuItem>
                  <MenuItem onClick={() => { setMenuAnchor(null); handleSignOut(); }}>Sign out</MenuItem>
                </Menu>
              </div>
            </>
          )}
        </header>

        <main className="cwrap">
          {preview && (
            <aside className="cpanel" aria-label="Preview">
              <div className="chead">
                <div className="ctitle">
                  {`Preview — this is what the funder of ${project?.name || 'this grant'} sees`}
                </div>
                <Button variant="contained" onClick={preview.onBack}>Back</Button>
              </div>
            </aside>
          )}
          {body}
        </main>
        {!preview && <ClientChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />}
      </div>
    </ThemeProvider>
  );
}
