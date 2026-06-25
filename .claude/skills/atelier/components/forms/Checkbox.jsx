import React from 'react';

/**
 * Checkbox with optional label. Brand-violet when checked.
 */
export function Checkbox({ checked = false, onChange, label, disabled = false, id, style = {}, ...rest }) {
  const autoId = React.useId();
  const cbId = id || autoId;
  return (
    <label htmlFor={cbId} style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      font: 'var(--weight-medium) 0.9375rem var(--font-sans)', color: 'var(--text-body)',
      ...style,
    }}>
      <span style={{ position: 'relative', display: 'inline-flex', flex: 'none' }}>
        <input
          id={cbId} type="checkbox" checked={checked} onChange={onChange} disabled={disabled}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} {...rest}
        />
        <span style={{
          width: 22, height: 22, borderRadius: 'var(--radius-xs)',
          background: checked ? 'var(--brand)' : 'var(--surface-card)',
          border: `1.5px solid ${checked ? 'var(--brand)' : 'var(--border-default)'}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
        }}>
          {checked ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          ) : null}
        </span>
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
