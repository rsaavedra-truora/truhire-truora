# Marketing site — worked example

A recreation of a **Truora.com**-style marketing landing page, built from the
design-system primitives (`Button`, `Badge`, `Card`) plus marketing-specific
sections in `components.jsx`. Every color, type, radius, and shadow value comes
from the design-system tokens; only layout is local — copy the visual usage,
not the page structure.

**Screen:** the full landing page:
`Nav` (sticky, translucent) → `Hero` (headline + dual CTA + live WhatsApp
conversation mock) → `TrustStrip` → `Features` (3 product pillars) →
`Metrics` (solid violet band) → `CtaBand` → `Footer`.

(The runnable browser preview lives in the Atelier repo showcase.) Spanish-first copy, sentence-case, verb-first CTAs.
The WhatsApp mock (`WhatsAppDemo`) shows the conversational onboarding that is
core to Truora's product story.

Components exported to `window`: `Nav, Hero, WhatsAppDemo, TrustStrip, Features,
Metrics, CtaBand, Footer` (+ `window.Icons`).
