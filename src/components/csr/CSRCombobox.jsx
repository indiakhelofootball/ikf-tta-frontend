// One text input that searches the list it picks from (WAI-ARIA combobox with
// a listbox popup). The input shows the picked option's label until the user
// types; typing filters, and leaving the field puts the picked label back.
import React, { useId, useMemo, useRef, useState } from 'react';

const sameId = (a, b) => String(a) === String(b);

export default function CSRCombobox({
  id,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  emptyText = 'Nothing matches.',
  allowAdd,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedby,
}) {
  const uid = useId();
  const inputId = id || `cbx-${uid}`;
  const listId = `${inputId}-list`;
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(null);
  const [active, setActive] = useState(-1);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const selected = value === '' || value == null
    ? null
    : options.find((o) => sameId(o.id, value)) || null;
  const selectedLabel = selected ? selected.label : '';

  const typed = (query ?? '').trim();
  const shown = useMemo(() => {
    const q = typed.toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.hint || ''}`.toLowerCase().includes(q));
  }, [options, typed]);

  const showAdd = Boolean(allowAdd) && typed !== '' && shown.length === 0;
  const count = shown.length + (showAdd ? 1 : 0);
  const optionId = (i) => `${inputId}-opt-${i}`;

  const close = () => {
    setOpen(false);
    setActive(-1);
    setQuery(null);
  };

  const openList = (start = -1) => {
    if (disabled) return;
    setOpen(true);
    setActive(start);
  };

  const pick = (opt) => {
    onChange(opt.id);
    setAddError('');
    close();
  };

  const add = async () => {
    if (adding) return;
    const text = typed;
    setAdding(true);
    setAddError('');
    try {
      const newId = await allowAdd.onAdd(text);
      onChange(newId);
      close();
    } catch (err) {
      setAddError(err?.message || `Could not add "${text}". Try again.`);
    } finally {
      setAdding(false);
    }
  };

  const choose = (i) => {
    if (i < shown.length) pick(shown[i]);
    else if (showAdd) add();
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
    setAddError('');
    setOpen(true);
    setActive(-1);
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openList(0);
        else if (count) setActive((i) => Math.min(i + 1, count - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openList(count - 1);
        else if (count) setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        if (open && count) { e.preventDefault(); setActive(0); }
        break;
      case 'End':
        if (open && count) { e.preventDefault(); setActive(count - 1); }
        break;
      case 'Enter':
        if (open && active >= 0) { e.preventDefault(); choose(active); }
        break;
      case 'Escape':
        if (open) { e.preventDefault(); close(); }
        break;
      default:
    }
  };

  const handleBlur = () => {
    if (query !== null && query.trim() === '' && selected) onChange('');
    close();
  };

  const clear = () => {
    onChange('');
    setAddError('');
    close();
    inputRef.current?.focus();
  };

  const describedBy = [ariaDescribedby, addError ? `${inputId}-err` : null]
    .filter(Boolean).join(' ') || undefined;

  return (
    <div className={`cbx${open ? ' open' : ''}`}>
      <input
        ref={inputRef}
        id={inputId}
        className="cbx-in"
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={describedBy}
        value={query ?? selectedLabel}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onClick={() => { if (!open) openList(); }}
        onBlur={handleBlur}
      />
      {selected && !disabled ? (
        <button
          type="button"
          className="cbx-clear"
          aria-label="Clear selection"
          onMouseDown={(e) => e.preventDefault()}
          onClick={clear}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      ) : null}
      <ul id={listId} role="listbox" className="cbx-list" hidden={!open}>
        {open && shown.map((o, i) => (
          <li
            key={o.id}
            id={optionId(i)}
            role="option"
            aria-selected={selected ? sameId(o.id, selected.id) : false}
            className={`cbx-opt${i === active ? ' on' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(o)}
          >
            <span className="cbx-label">{o.label}</span>
            {o.hint ? <span className="cbx-hint">{o.hint}</span> : null}
          </li>
        ))}
        {open && shown.length === 0 ? (
          <li className="cbx-empty" role="presentation">{emptyText}</li>
        ) : null}
        {open && showAdd ? (
          <li
            id={optionId(shown.length)}
            role="option"
            aria-selected={false}
            aria-disabled={adding || undefined}
            className={`cbx-opt cbx-add${active === shown.length ? ' on' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(shown.length)}
            onClick={add}
          >
            {adding ? `Adding "${typed}"…` : allowAdd.label(typed)}
          </li>
        ) : null}
      </ul>
      {addError ? (
        <p id={`${inputId}-err`} className="cbx-err" role="alert">{addError}</p>
      ) : null}
    </div>
  );
}
