import React from 'react';

const sizes = { xs: 28, sm: 36, md: 44, lg: 56, xl: 72 };

function initials(name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || '?';
}

/**
 * User avatar — image, or initials fallback on a violet-tinted surface.
 */
export function Avatar({ name = '', src = null, size = 'md', status = null, style = {}, ...rest }) {
  const px = sizes[size] || sizes.md;
  const statusColor = { online: 'var(--success)', busy: 'var(--danger)', away: 'var(--warning)', offline: 'var(--neutral-400)' }[status];
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flex: 'none', ...style }} {...rest}>
      <span
        style={{
          width: px, height: px, borderRadius: '50%', overflow: 'hidden',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--brand-subtle)', color: 'var(--brand-active)',
          fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-bold)',
          fontSize: px * 0.4, letterSpacing: '0.01em', userSelect: 'none',
          boxShadow: 'inset 0 0 0 1px rgba(7,0,26,0.05)',
        }}
      >
        {src
          ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initials(name)}
      </span>
      {statusColor ? (
        <span style={{
          position: 'absolute', right: -1, bottom: -1,
          width: Math.max(8, px * 0.28), height: Math.max(8, px * 0.28),
          borderRadius: '50%', background: statusColor,
          border: '2px solid var(--surface-card)',
        }} />
      ) : null}
    </span>
  );
}
