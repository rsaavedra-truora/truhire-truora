# Truora Design System

**Contents** — read top to bottom, or jump:
1. [Sources](#sources) — provenance + the official palette table
2. [Content fundamentals](#content-fundamentals) — voice, tone, person, casing, copy rules
3. [Visual foundations](#visual-foundations) — color hierarchy, glass effect, type, spacing, states
4. [Iconography](#iconography) — brand marks, product icons, shape system, UI icons
5. [Index / manifest](#index--manifest) — what every file in this system is for

A living design system for **Truora** — a Latin American technology company that
builds agile, secure connections between businesses and their users. Founded in
2018, Truora grew from a background-check API into an end-to-end **user-acquisition
funnel** platform spanning digital identity, electronic signatures, and customer
engagement — delivered primarily over **WhatsApp**. Its mission: create prosperity
in the region by closing the trust and infrastructure gap through technology.

This project is consumed by other projects: link the single root `styles.css` to
inherit every token and webfont, and import components from the npm package
(`import { Button } from '@raandino/atelier-react'` — tokens ship as
`@raandino/atelier-tokens`).

---

## Sources

Everything here was derived from the official brand package the user supplied:

- **`Branding Truora/01. Manual de marca/`** — `Manual de marca - Truora.pdf` and
  `Manual de marca - Truora - Socios.pdf` (partner manual). The PDFs are image-only /
  outlined-text, but the user supplied **manual page captures** covering the color
  palette ("Una jerarquía visual perfecta", "Porcentaje y uso del color"), typography
  (Host Grotesk specs), and the **Glass Effect** style guide — those pages are the
  normative source for every token here. Brand photography specimens (warm,
  natural-light lifestyle shots) were extracted from the partner manual → `assets/imagery/`.
- **`Branding Truora/02. Logo/`** — full wordmark (full-color, black,
  light) → corrected SVGs in `assets/svg/` (the raw originals stay in the Atelier repo).
- **`Branding Truora/03. Icono/`** — isotype / app-icon mark → corrected SVGs in `assets/svg/` (raw originals in the Atelier repo).

**Palette (from the manual, with usage percentages):**

| Color | Hex | Share | Use |
|---|---|---|---|
| Blanco | `#FAFBFF` | 40% | base, backgrounds, negative space |
| Azul violeta | `#3C1AEA` | 30% | THE Truora color — titles, key elements, brand panels |
| Azul medianoche | `#01022E` | 15% | contrast — dark backgrounds & text |
| Naranja | `#EE792F` | 10% | **CTAs, alerts, primary highlights** |
| Azul claro | `#9BD2F3` | 5% | secondary backgrounds, details, info |

> Note: the supplied logo artwork samples at `#5300FF` (brighter than the manual's
> UI violet `#3C1AEA`). The logo assets are kept exactly as shipped; UI tokens use
> the manual's `#3C1AEA`. Flag if the logo should be recolored to match.

> ✅ **Typeface: Host Grotesk** (confirmed by the manual's typography pages —
> "H1/H2: Host Grotesk Medium", body in Host Grotesk Light). Self-hosted latin subsets live in `tokens/fonts/` with `@font-face` rules in
> `tokens/fonts.css` — this installed payload ships the weights the system uses
> (Host Grotesk 300/400/500 + JetBrains Mono 400). JetBrains Mono covers code/API surfaces.

---

## CONTENT FUNDAMENTALS

How Truora writes. The product is bilingual (Spanish-first for LatAm markets,
English for docs/global), but the *voice* is consistent across languages.

- **Tone:** confident, warm, and plain-spoken. Truora positions itself as the
  trustworthy connective tissue between a business and its users — so copy is
  reassuring and direct, never hypey or jargon-heavy. Think "expert colleague,"
  not "salesperson" or "robot."
- **Person:** addresses the reader as **"you" / "tú"** (second person, informal in
  Spanish — *tú*, not *usted*) and speaks as **"we" / "nosotros"** for the company.
  User-facing flows (WhatsApp onboarding, signature requests) are conversational
  and first-name where possible.
- **Casing:** **Sentence case** everywhere — headlines, buttons, menu items, form
  labels. No Title Case In UI. The only all-caps usage is the small **overline /
  eyebrow** label above a section heading (wide letter-spacing). Buttons read as
  verbs: "Empieza gratis", "Agenda una demo", "Verificar identidad", "Start free",
  "Book a demo".
- **Length & rhythm:** short sentences, active voice. Lead with the user benefit,
  then the mechanism. Marketing headlines are a single bold claim ("Convierte más
  usuarios, con menos fricción"); supporting copy is one or two calm lines.
- **Numbers & proof:** Truora leans on concrete outcomes (conversion %, time-to-verify,
  countries covered) but uses them sparingly and only when real — never invented
  stat-slop. Money in regional formats (e.g. `$1.200 COP`, `R$ 49`).
- **Emoji:** essentially **not used** in product UI or marketing chrome. The one
  honest exception is *inside simulated WhatsApp conversations*, where a sparing ✅
  or 👋 reflects how the channel actually reads. Don't decorate the UI with emoji.
- **Vibe words:** *agile, secure, trust, frictionless, conversational, prosperity,
  connection.* Avoid: *disrupt, revolutionary, synergy, leverage (as verb).*

Example voice:
> **Verifica a tus usuarios en segundos, no en días.**
> Identidad, firma y onboarding en una sola conversación de WhatsApp.
> [ Empieza gratis ]   [ Agenda una demo ]

---

## VISUAL FOUNDATIONS

The Truora look is **bright, optimistic, solid-color tech**: generous Blanco space,
Azul violeta doing the brand work, Naranja reserved for the few moments that demand
action, and the **Glass Effect** — not gradients — creating depth.

- **Color hierarchy (40/30/15/10/5):** Blanco `#FAFBFF` is the base (40%). **Azul
  violeta `#3C1AEA`** (30%) carries titles, key elements, and brand panels. **Azul
  medianoche `#01022E`** (15%) is the dark surface & text color. **Naranja `#EE792F`**
  (10%) is exclusively for CTAs, alerts, and primary highlights — the thing you want
  noticed. **Azul claro `#9BD2F3`** (5%) balances compositions: secondary backgrounds,
  info details. Plus **WhatsApp green `#25D366`** for the channel that is core to the
  product. Respect the proportions — violet dominates, orange stays scarce.
- **Gradients: FORBIDDEN.** "Cero degradados. En Truora somos de colores sólidos."
  Never fill backgrounds or shapes with gradients. When you need volume or contrast,
  use the **Glass Effect** instead.
- **Glass Effect (the signature):** translucent panels — `--glass-fill` + 1px
  `--glass-border` + `backdrop-filter: blur(20px)` + `--glass-radius` (24px). Two
  uses: (1) **floating "bubbles"/cards over photography** to surface validations,
  results, or modals without hiding the real world; (2) **highlight panels** on
  midnight/violet surfaces. Rules: **rectangles and squares ONLY — never circles**;
  imagery beneath the glass gets a 20px blur radius. Use `GlassCard` / `.tru-glass`.
- **Type:** **Host Grotesk** — headings in **Medium (500), never bolder**; body and
  long copy in **Light (300)** / Regular. Manual scale: H1 80/80 (100%), H2 46/50
  (109%), cita destacada 27/30, cuerpo grande 24/29, cuerpo 18/22. Near-zero letter
  spacing (Host Grotesk tracks naturally). Mono (JetBrains Mono) only on code/API.
- **Spacing:** 4px base grid. Layouts breathe. Suggested defaults — opt-in starting
  values, not structure rules (your wireframe decides the actual shape): marketing
  surfaces take big vertical rhythm (80–96px), product UI sits denser (16–24px);
  containers max ~1200px, narrow prose ~760px.
- **Corner radii:** buttons, pills, badges are **fully rounded (pill)**. Inputs and
  small controls ~14px. Cards 24px; large panels 32–40px; glass 24px. Avatars may be
  circles — glass may not.
- **Cards:** white surface, 1px `--border-subtle`, subtle cool shadow (`--shadow-md`),
  generous padding, 24px radius. Elevation comes from shadow, not outline. Avoid the
  "rounded card + colored left-border accent" trope.
- **Shadows:** subtle, cool, midnight-tinted (`rgba(1,2,46,…)`) — **no colored glow
  shadows on buttons or anything else**. Buttons are flat solid color.
- **Borders:** hairline 1px `--border-subtle` on dividers; inputs have a **single**
  1.5px border that turns violet on focus — **no double borders, no focus rings**.
- **Backgrounds:** predominantly Blanco. Violet or midnight panels appear as
  deliberate full-bleed solid moments (e.g. a hero, a metrics band, a login screen).
  No textures, no patterns, no gradients. Photography is the main imagery device.
- **Imagery:** warm, **natural-light photography of real people working** — earthy,
  human, optimistic, candid. Photos sit in rounded frames (24–32px) and host glass
  bubbles. No stock clichés, no heavy filters, no B&W.
- **Animation:** restrained and smooth. Entrances fade + small rise (8–12px), ~200ms,
  `--ease-out`. A subtle spring for toggles. No infinite loops on content.
- **Hover states:** solid colors **darken one step** (`--cta` → `--cta-hover`);
  ghost/secondary get a faint violet tint background. Links underline. Cards lift
  slightly (shadow + translateY -2px).
- **Press states:** darken one more step + small scale-down (~0.97), fast.
- **Focus:** a 2px violet outline (offset 2px) for keyboard users — never removed.

---

## ICONOGRAPHY

- **Brand marks:** the **wordmark** and the **isotype** — a stylized "T" feather/leaf form cradling a checkmark, symbolizing trust + verification. Each comes in **full-color** (violet icon `#5300FF` + ink wordmark `#07001A`), **black** (`#000000`), and **light** (`#F9FAFF` — a violet-tinged off-white, *not* pure white; use on violet or ink backgrounds), in SVG (the PNG originals live in the Atelier repo).
  **Use the SVGs in `assets/svg/`** — they carry explicit `fill` attributes and recolor/scale cleanly. The original brand-package files (stripped fills, render black) stay in the Atelier repo as source-of-truth copies; this installed skill ships only the corrected SVGs.
- **Product icons (from the manual):** Truora's four products have official icons
  **built from the logo's own curves** ("La forma de nuestro logo en nuestros íconos"):
  **identidad** (digital-identity validation — user + device), **verificacion**
  (background checks — the isotype check itself), **engagement** (customer engagement —
  flower insignia, a nod to Meta's verified badge), **firma** (e-signature — stylus).
  Recreated here from `Logo full.svg`: use the **`ProductIcon`** component
  (`badge` prop gives the manual's violet rounded-square presentation); raw SVGs in
  `assets/product-icons/` (currentColor fills).
- **Shape system ("ADN en formas"):** graphic shapes whose curves are **extracted
  verbatim from the isotype** without deformation — fin, leaf, body, check — plus the
  manual's compositions: **flower** (8 rotated leaves), crescent, seed, circle, and
  **El Ojo de Truora** (the eye — capsule + lens + pupil, from Truora's origin as the
  'Oráculo de la Verdad'). Use them to frame photos, build background rhythm, and
  give pieces brand DNA; solid colors only, shapes may interlock. Use the
  **`BrandShape`** component; raw SVGs in `assets/shapes/`.
- **UI icons:** for generic UI chrome (search, settings, arrows…) the system uses
  **[Lucide](https://lucide.dev)** — a clean 2px-stroke outline set that sits well
  next to the brand glyphs. Product nav/feature slots should prefer the brand
  ProductIcons. *(Lucide is a substitution — flag if Truora has an in-house UI set.)*
- **Emoji as icons:** avoid in UI chrome. Only acceptable inside simulated WhatsApp
  message bubbles (✅ 👋 📄) to read authentically.
- **Don't:** hand-draw bespoke SVG icons, mix icon families, or use filled + outline
  styles together. Keep one family, one stroke weight.

---

## INDEX / MANIFEST

Root files:
- **`styles.css`** — the single entry point consumers link. `@import` manifest only.
- **`readme.md`** — this guide.
- **`SKILL.md`** — the skill entry: modes, workflow checklist, wireframe-first step, validation loop.
- **`components.md`** — generated component index: descriptions, npm imports, usage-card links.
- **`wireframe-template.md`** — structure-only skeleton the wireframe-first interview copies into the consumer project as `wireframe.md`.
- **`scripts/check.mjs`** — the brand validator. Run it on everything you generate.
- **`_adherence.oxlintrc.json`** — ESLint brand-adherence ruleset for production React.

`tokens/` — CSS custom properties, each `@import`ed by `styles.css`:
- `colors.css` · `typography.css` · `spacing.css` · `fonts.css` · `base.css`
- `fonts/` — self-hosted woff2 (**Host Grotesk** 300/400/500, JetBrains Mono 400 — the weights the system uses)

`assets/`
- **`svg/` — color-corrected SVG marks (use these):** wordmark + isotype × full / black / light
- **`shapes/` — "ADN en formas" shape system** (fin, leaf, body, check, flower, crescent, seed, ojo)
- **`product-icons/` — the four product icons** (identidad, verificacion, engagement, firma)
- `imagery/` — brand lifestyle photography (web-sized WebP, from the brand manual)

`components/` — reusable React primitives (published as `@raandino/atelier-react`); each ships
its `.jsx` source + `.prompt.md` usage card. `components.md` indexes them all.
- `core/` — **Button** (9 variants; pill; primary = Naranja CTA), **IconButton**, **Badge** (7 tones), **Avatar**, **Card**, **GlassCard** (the Glass Effect)
- `forms/` — **Input** (single border, no rings), **Checkbox**, **Switch**
- `navigation/` — **Tabs** (underline, count badges)
- `brand/` — **BrandShape** (ADN en formas), **ProductIcon** (the four product icons)

`ui_kits/` — **worked examples**, not layout templates: the visual language applied to four very
different surfaces. Copy token, glass, and component usage from them — never page structure
(structure comes from the wireframe-first step; each README maps its sections):
- `marketing/` — truora.com-style landing page (hero + WhatsApp demo + features + glass showcase + metrics + CTA)
- `dashboard/` — Truora product console: login (photo + glass panel) → sidebar + stats + verifications table + user drawer
- `finance/` — finance reporting panel (KPI cards + SVG charts + glass band + detail table; static HTML)
- `signer/` — e-signature signer screen (document viewport + thumbnails + doc-chat drawer; static HTML)

> Repo-only (not installed with this skill): the brand-package originals with stripped fills,
> the foundation specimen cards, the browser-preview mounts and the generated build
> artifacts. They live in the Atelier repository, where the showcase site consumes them.
