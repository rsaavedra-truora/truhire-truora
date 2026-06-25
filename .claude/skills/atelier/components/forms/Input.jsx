import React from 'react';

/**
 * Text input field with label, helper/error text, and optional adornments.
 */
export function Input({
  label, hint, error, leftAdornment = null, rightAdornment = null,
  id, value, onChange, placeholder, type = 'text', disabled = false,
  style = {}, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const autoId = React.useId();
  const inputId = id || autoId;
  const invalid = !!error;
  const borderColor = invalid ? 'var(--danger)' : (focus ? 'var(--brand)' : 'var(--border-default)');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label ? (
        <label htmlFor={inputId} style={{
          font: 'var(--weight-medium) 0.875rem var(--font-sans)', color: 'var(--text-strong)',
        }}>{label}</label>
      ) : null}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: disabled ? 'var(--surface-sunken)' : 'var(--surface-card)',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        padding: '0 14px', height: 46,
        transition: 'border-color var(--dur-fast) var(--ease-out)',
      }}>
        {leftAdornment ? <span style={{ display: 'inline-flex', color: 'var(--text-muted)', flex: 'none' }}>{leftAdornment}</span> : null}
        <input
          id={inputId} type={type} value={value} onChange={onChange}
          placeholder={placeholder} disabled={disabled}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            font: 'var(--weight-regular) 1rem var(--font-sans)', color: 'var(--text-strong)',
            minWidth: 0,
          }}
          {...rest}
        />
        {rightAdornment ? <span style={{ display: 'inline-flex', color: 'var(--text-muted)', flex: 'none' }}>{rightAdornment}</span> : null}
      </div>
      {(hint || error) ? (
        <span style={{
          font: 'var(--weight-regular) 0.8125rem var(--font-sans)',
          color: invalid ? 'var(--danger)' : 'var(--text-muted)',
        }}>{error || hint}</span>
      ) : null}
    </div>
  );
}
