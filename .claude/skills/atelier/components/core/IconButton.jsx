import React from 'react';

const sizes = { sm: 36, md: 44, lg: 54 };

const variants = {
  primary:  { bg: 'var(--brand)', fg: 'var(--on-brand)', border: 'transparent', hover: 'var(--brand-hover)' },
  secondary:{ bg: 'var(--surface-card)', fg: 'var(--brand)', border: 'var(--brand)', hover: 'var(--brand-subtle)' },
  ghost:    { bg: 'transparent', fg: 'var(--text-body)', border: 'transparent', hover: 'var(--surface-sunken)' },
  subtle:   { bg: 'var(--brand-subtle)', fg: 'var(--brand-active)', border: 'transparent', hover: 'var(--brand-subtle-2)' },
};
/**
 * Square icon-only button. Always pass an accessible `label`.
 */
export function IconButton({ children, label, variant = 'ghost', size = 'md', disabled = false, onClick, style = {}, ...rest }) {
  const px = sizes[size] || sizes.md;
  const v = variants[variant] || variants.ghost;
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: px, height: px,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-pill)',
        background: disabled ? v.bg : (hover ? v.hover : v.bg),
        color: v.fg,
        border: `1.5px solid ${v.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
