Truora pill action button — sentence-case, verb-first labels; `primary` is Naranja (the brand's CTA color), `violet` for key brand elements, `glass` over photos/dark panels.

```jsx
import { Button } from '@raandino/atelier-react';

<Button variant="primary" size="md" onClick={start}>Empieza gratis</Button>
<Button variant="violet">Agenda una demo</Button>
<Button variant="glass">Ver demo</Button>
<Button variant="whatsapp" leftIcon={<WhatsAppIcon/>}>Continuar por WhatsApp</Button>
```

Variants: `primary` (naranja CTA) · `violet` · `midnight` · `secondary` (violet outline) · `ghost` · `subtle` (violet tint) · `glass` (Glass Effect) · `whatsapp` · `inverse` (white, for violet/midnight panels).
Sizes: `sm` 36 · `md` 44 · `lg` 54. Always pill-shaped. No gradients, no glow shadows — hover darkens one step, press scales to 0.97.
