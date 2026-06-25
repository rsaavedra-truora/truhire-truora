import React from 'react';

const sizes = {
  sm: { fontSize: '0.875rem', padding: '0 18px', height: 36, gap: 6 },
  md: { fontSize: '1rem',     padding: '0 24px', height: 44, gap: 8 },
  lg: { fontSize: '1.0625rem',padding: '0 32px', height: 54, gap: 10 },
};

/* Solid colors only — no gradients, no glow shadows (brand manual). */
const variants = {
  primary: { background: 'var(--cta)', color: 'var(--on-cta)', border: '1px solid transparent' },
  violet:  { background: 'var(--brand)', color: 'var(--on-brand)', border: '1px solid transparent' },
  midnight:{ background: 'var(--midnight)', color: 'var(--on-midnight)', border: '1px solid transparent' },
  secondary: { background: 'transparent', color: 'var(--brand)', border: '1.5px solid var(--brand)' },
  ghost:   { background: 'transparent', color: 'var(--brand)', border: '1px solid transparent' },
  subtle:  { background: 'var(--brand-subtle)', color: 'var(--brand-active)', border: '1px solid transparent' },
  glass:   { background: 'var(--glass-fill)', color: '#fff', border: '1px solid var(--glass-border)', backdropFilter: 'blur(var(--glass-blur))', WebkitBackdropFilter: 'blur(var(--glass-blur))' },
  whatsapp:{ background: 'var(--whatsapp)', color: '#fff', border: '1px solid transparent' },
  inverse: { background: 'var(--surface-card)', color: 'var(--brand)', border: '1px solid transparent' },
};

const hoverBg = {
  primary: 'var(--cta-hover)', violet: 'var(--brand-hover)', midnight: 'var(--neutral-800)',
  secondary: 'var(--brand-subtle)', ghost: 'var(--brand-subtle)', subtle: 'var(--brand-subtle-2)',
  glass: 'var(--glass-fill-strong)', whatsapp: 'var(--whatsapp-600)', inverse: 'var(--neutral-50)',
};
const activeBg = {
  primary: 'var(--cta-active)', violet: 'var(--brand-active)', midnight: 'var(--neutral-700)',
  secondary: 'var(--brand-subtle-2)', ghost: 'var(--brand-subtle-2)', subtle: 'var(--violet-200)',
  glass: 'var(--glass-fill-strong)', whatsapp: 'var(--whatsapp-700)', inverse: 'var(--neutral-100)',
};

/**
 * Truora pill-shaped action button. Sentence-case, verb-first labels.
 * `primary` is Naranja — the CTA color per the brand manual.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon = null,
  rightIcon = null,
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  style = {},
  ...rest
}) {
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 'var(--weight-semibold)',
        fontFamily: 'var(--font-sans)',
        lineHeight: 1,
        borderRadius: 'var(--radius-pill)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        whiteSpace: 'nowrap',
        transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
        transform: !disabled && active ? 'scale(0.97)' : 'scale(1)',
        ...v,
        background: disabled ? v.background : (active ? activeBg[variant] : (hover ? hoverBg[variant] : v.background)),
        ...style,
      }}
      {...rest}
    >
      {leftIcon ? <span style={{ display: 'inline-flex', flex: 'none' }}>{leftIcon}</span> : null}
      {children}
      {rightIcon ? <span style={{ display: 'inline-flex', flex: 'none' }}>{rightIcon}</span> : null}
    </button>
  );
}
