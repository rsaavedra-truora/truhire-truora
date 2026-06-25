import React from 'react';

const pads = { sm: 16, md: 24, lg: 32 };

/**
 * Surface container — white, soft violet-tinted shadow, ~20px radius, no heavy
 * border. Optional hover-lift for interactive cards.
 */
export function Card({ children, padding = 'md', interactive = false, elevated = true, style = {}, ...rest }) {
  const p = pads[padding] ?? pads.md;
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={interactive ? () => setHover(true) : undefined}
      onMouseLeave={interactive ? () => setHover(false) : undefined}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: p,
        boxShadow: elevated ? (hover ? 'var(--shadow-lg)' : 'var(--shadow-md)') : 'none',
        transform: interactive && hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
