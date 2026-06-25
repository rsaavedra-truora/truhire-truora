import React from 'react';

const pads = { sm: 14, md: 20, lg: 28 };
const radii = {
  sm: 'var(--glass-radius-sm)',  /* caption bubbles, chips */
  md: 'var(--glass-radius)',     /* cards & panes */
  lg: 'var(--glass-radius-lg)',  /* logo / icon tiles */
};

const surfaces = {
  dark: {  /* on midnight / violet panels — near-transparent pane, white text */
    background: 'var(--glass-fill)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-highlight)',
    color: 'var(--neutral-25)',
  },
  photo: { /* over photography — frosted white pane, ink text, violet titles */
    background: 'var(--glass-fill-frost)',
    border: '1px solid var(--glass-border-frost)',
    boxShadow: 'var(--glass-highlight)',
    color: 'var(--text-strong)',
  },
  light: { /* on light surfaces — faint violet tint */
    background: 'var(--glass-fill-light)',
    border: '1px solid var(--glass-border-light)',
    boxShadow: 'none',
    color: 'var(--text-strong)',
  },
};

/**
 * Truora Glass Effect surface — the brand's signature depth device.
 * Rectangles/squares ONLY (never circles). 20px backdrop blur.
 * Signature anatomy: tuck a vivid violet brand shape partly BEHIND
 * the pane so it blooms through the blur. Over photography use
 * on="photo" (frosted white, dark text). Radius is proportional:
 * sm = bubbles, md = cards, lg = logo/icon tiles (~16% of side).
 */
export function GlassCard({ children, on = 'dark', padding = 'md', radius = 'md', style = {}, ...rest }) {
  const surface = surfaces[on] ?? surfaces.dark;
  return (
    <div
      style={{
        ...surface,
        borderRadius: typeof radius === 'number' ? radius : (radii[radius] ?? radii.md),
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        padding: pads[padding] ?? pads.md,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
