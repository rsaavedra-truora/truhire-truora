Truora's signature Glass Effect surface — use it for depth instead of gradients (which are forbidden). The signature look: tuck a violet brand shape partly BEHIND the pane so it blooms through the blur.

```jsx
import { GlassCard } from '@raandino/atelier-react';

{/* Over photography → frosted white, ink text, violet title */}
<div style={{ position:'relative' }}>
  <img src="photo.jpg" />
  <GlassCard on="photo" radius="sm" style={{ position:'absolute', top:24, right:24 }}>
    <b style={{ color:'var(--brand)' }}>Identidad verificada</b>
    <div>Análisis facial confirmado</div>
  </GlassCard>
</div>

{/* On midnight panels → transparent pane; put a violet shape behind it */}
<div style={{ position:'relative', background:'var(--midnight)' }}>
  <div style={{ position:'absolute', width:90, height:90, borderRadius:'50%', background:'var(--brand)', right:10, bottom:10 }}></div>
  <GlassCard on="dark" radius="lg" style={{ position:'relative', width:140, height:140 }}>
    <img src="icono-light.svg" />
  </GlassCard>
</div>
```

`on`: `dark` (midnight/violet panels) · `photo` (frosted, over imagery) · `light`. `radius`: `sm` bubbles · `md` cards · `lg` logo tiles (≈16% of side). Glass is rectangles/squares ONLY — never circles.
