// D-019: a grant names the cities it funds, out of its TTA project + season's
// trial cities. A season can run in 80 cities and a funder pays for a few, so
// the grant picks them here instead of inheriting the whole season.
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { csrAPI } from '../../services/api';

const label = (c, showTrial) => {
  const where = c.state ? `${c.cityName}, ${c.state}` : c.cityName;
  return showTrial ? `${where} (${c.trialCode})` : where;
};

export default function GrantCityPicker({ projectRefId, season, value, onChange, error, onOptions }) {
  const [state, setState] = useState({ status: 'loading', options: [] });
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setState({ status: 'loading', options: [] });
    try {
      const data = await csrAPI.grantCityOptions(projectRefId, season);
      const options = Array.isArray(data) ? data : [];
      setState({ status: 'ready', options });
      if (onOptions) onOptions(options);
    } catch (e) {
      setState({ status: 'error', options: [], message: e.message });
      if (onOptions) onOptions(null);
    }
  }, [projectRefId, season, onOptions]);

  useEffect(() => { load(); }, [load]);

  const { status, options } = state;
  const showTrial = useMemo(() => new Set(options.map((c) => c.trialId)).size > 1, [options]);
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return options;
    return options.filter((c) => label(c, showTrial).toLowerCase().includes(q));
  }, [options, filter, showTrial]);

  const chosen = new Set(value);
  const toggle = (cid) => onChange(chosen.has(cid) ? value.filter((v) => v !== cid) : [...value, cid]);

  return (
    <div className="pform-field">
      <label htmlFor="csr-city-filter">
        Cities this grant funds <span className="pform-req" aria-hidden="true">*</span>
      </label>

      {status === 'loading' && <p className="pform-cities-state" role="status">Loading cities…</p>}

      {status === 'error' && (
        <p className="pform-help bad" role="alert">
          Could not load the cities{state.message ? `: ${state.message}` : '.'}{' '}
          <button type="button" className="ghostbtn" onClick={load}>Retry</button>
        </p>
      )}

      {status === 'ready' && options.length === 0 && (
        <p className="pform-cities-state">
          This TTA project and season has no trial cities yet. Add them in TTA first, then pick them here.
        </p>
      )}

      {status === 'ready' && options.length > 0 && (
        <>
          <div className="pform-cities-tools">
            <input
              id="csr-city-filter" type="search" value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search cities"
              aria-describedby="csr-cities-help"
            />
            <span className="pform-cities-state">{value.length} of {options.length} selected</span>
          </div>
          <div className="pform-cities" role="group" aria-label="Cities this grant funds">
            {shown.map((c) => (
              <label key={c.id} className="chk">
                <input type="checkbox" checked={chosen.has(c.id)} onChange={() => toggle(c.id)} />
                {label(c, showTrial)}
              </label>
            ))}
            {shown.length === 0 && <p className="pform-cities-state">No city matches “{filter}”.</p>}
          </div>
          <p id="csr-cities-help" className={`pform-help${error ? ' bad' : ''}`}>
            {error || 'Only these cities are shown to the funder, and an activity picks its city from them.'}
          </p>
        </>
      )}
    </div>
  );
}
