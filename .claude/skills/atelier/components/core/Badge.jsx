import React from 'react';

const tones = {
  brand:    { bg: 'var(--brand-subtle)', fg: 'var(--brand-active)', dot: 'var(--brand)' },
  neutral:  { bg: 'var(--surface-sunken)', fg: 'var(--text-body)', dot: 'var(--neutral-400)' },
  success:  { bg: 'var(--success-soft)', fg: 'var(--success-700)', dot: 'var(--success)' },
  warning:  { bg: 'var(--warning-soft)', fg: 'var(--warning-700)', dot: 'var(--warning)' },
  danger:   { bg: 'var(--danger-soft)', fg: 'var(--danger-700)', dot: 'var(--danger)' },
  info:     { bg: 'var(--info-soft)', fg: 'var(--info-700)', dot: 'var(--info)' },
  whatsapp: { bg: 'var(--whatsapp-soft)', fg: 'var(--whatsapp-700)', dot: 'var(--whatsapp)' },
};

/**
 * Small status / category label. Sentence-case.
 */
export function Badge({ children, tone = 'neutral', dot = false, solid = false, style = {}, ...rest }) {
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: dot ? '4px 10px 4px 8px' : '4px 11px',
        fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 'var(--weight-semibold)',
        lineHeight: 1.2, letterSpacing: 'var(--tracking-snug)',
        borderRadius: 'var(--radius-pill)',
        background: solid ? t.dot : t.bg,
        color: solid ? '#fff' : t.fg,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {dot ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: solid ? '#fff' : t.dot, flex: 'none' }} /> : null}
      {children}
    </span>
  );
}
