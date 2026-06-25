import React from 'react';

const dims = { sm: { w: 36, h: 20, k: 14 }, md: { w: 46, h: 26, k: 20 } };

/**
 * On/off switch. Brand-violet track when on; spring-eased knob.
 */
export function Switch({ checked = false, onChange, label, size = 'md', disabled = false, id, style = {}, ...rest }) {
  const d = dims[size] || dims.md;
  const autoId = React.useId();
  const swId = id || autoId;
  const pad = (d.h - d.k) / 2;
  return (
    <label htmlFor={swId} style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      font: 'var(--weight-medium) 0.9375rem var(--font-sans)', color: 'var(--text-body)',
      ...style,
    }}>
      <input id={swId} type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} {...rest} />
      <span style={{
        width: d.w, height: d.h, borderRadius: 'var(--radius-pill)', flex: 'none',
        background: checked ? 'var(--brand)' : 'var(--neutral-300)',
        position: 'relative', transition: 'background var(--dur-base) var(--ease-out)',
      }}>
        <span style={{
          position: 'absolute', top: pad, left: checked ? d.w - d.k - pad : pad,
          width: d.k, height: d.k, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(1,2,46,0.3)',
          transition: 'left var(--dur-base) var(--ease-spring)',
        }} />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
