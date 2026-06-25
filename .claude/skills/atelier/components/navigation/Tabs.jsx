import React from 'react';

/**
 * Underline tabs. Controlled via `value` + `onChange`. `items` is
 * [{ value, label, badge? }].
 */
export function Tabs({ items = [], value, onChange, style = {} }) {
  const [hover, setHover] = React.useState(null);
  return (
    <div role="tablist" style={{
      display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', ...style,
    }}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(it.value)}
            onMouseEnter={() => setHover(it.value)}
            onMouseLeave={() => setHover(null)}
            style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '12px 14px', marginBottom: -1,
              font: `var(--weight-semibold) 0.9375rem var(--font-sans)`,
              color: active ? 'var(--brand)' : (hover === it.value ? 'var(--text-strong)' : 'var(--text-muted)'),
              transition: 'color var(--dur-fast) var(--ease-out)',
            }}
          >
            {it.label}
            {it.badge != null ? (
              <span style={{
                font: 'var(--weight-bold) 0.6875rem var(--font-sans)',
                background: active ? 'var(--brand-subtle)' : 'var(--surface-sunken)',
                color: active ? 'var(--brand-active)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-pill)', padding: '1px 7px', lineHeight: 1.5,
              }}>{it.badge}</span>
            ) : null}
            <span style={{
              position: 'absolute', left: 8, right: 8, bottom: 0, height: 3,
              borderRadius: '3px 3px 0 0',
              background: active ? 'var(--brand)' : 'transparent',
              transition: 'background var(--dur-base) var(--ease-out)',
            }} />
          </button>
        );
      })}
    </div>
  );
}
