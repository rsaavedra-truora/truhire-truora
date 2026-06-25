Brand graphic shapes ("ADN en formas") — isotype curves used as compositional elements; frame photos, build rhythm, decorate panels.

```jsx
import { BrandShape } from '@raandino/atelier-react';

<BrandShape shape="flower" color="var(--brand)" size={96} />
<BrandShape shape="crescent" color="var(--cta)" size={80} />
<BrandShape shape="ojo" color="var(--midnight)" accent="var(--neutral-25)" size={72} />
```

Shapes: `fin` · `leaf` · `body` · `check` (verbatim isotype curves) · `flower` (8 rotated leaves) · `crescent` · `seed` · `circle` · `ojo` (El Ojo de Truora). Solid brand colors only; never gradients. Raw SVG files live in `assets/shapes/`.
