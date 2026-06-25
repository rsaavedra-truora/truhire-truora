---
name: atelier
description: Truora's official design system for generating on-brand interfaces and assets — landing pages, dashboards, mockups, prototypes, slides, and production React components. Use when designing, prototyping, or reviewing anything for Truora ("diseña", "prototipa", "revisa"), or when a request mentions the Truora brand, Truora colors or typography, the glass effect, azul violeta, Host Grotesk, or @raandino/atelier packages. Provides color/type/spacing tokens, glass-effect components, brand shapes, product icons, photography, full UI kits, a generated component index, and a brand validator script that checks generated output.
version: 0.1.0
user-invocable: true
argument-hint: "[wireframe|design|prototype|review] [objective]"
---

Read `.claude/skills/atelier/readme.md` first — its table of contents routes you. Then
`.claude/skills/atelier/components.md` for the component index (props, imports, usage links).

**Scope — visual language only.** This skill defines Truora's visual language:
color, typography, the glass effect, spacing, iconography, and component styling.
It never dictates layout, page shape, or information architecture — interface
structure is always the user's intentional decision, made per build (see
"Wireframe first" below).

**Two modes — pick by the need:**

- **Throwaway artifacts** (slides, mocks, prototypes): copy assets out and build static
  HTML for the user to view — link `.claude/skills/atelier/styles.css` to inherit every token and
  webfont, and read the rules here to stay on-brand.
- **Production frontend code**: prefer the published packages over copying files:
  ```bash
  npm install @raandino/atelier-react @raandino/atelier-tokens
  ```
  Import the tokens once (`import '@raandino/atelier-tokens/tokens.css'` — CSS variables +
  self-hosted fonts), then use the typed, tree-shakeable components
  (`import { Button, GlassCard } from '@raandino/atelier-react'`). Already on shadcn/ui?
  Drop in `@raandino/atelier-tokens/shadcn-theme.css` to reskin it the Truora way (the CTA
  orange stays reserved). Either way, the rules in this skill are the source of truth.

## Actions

The **first token** of the arguments picks the action. Anything else — or no
arguments — falls through to `design` ("design a wireframe for…" runs `design`,
whose flow routes through the wireframe tiers anyway). The Spanish trigger verbs
(diseña, prototipa, revisa) are discovery words, not dispatch tokens — map them
to the closest action.

| Action | What it does |
|---|---|
| `wireframe <thing>` | Structure interview only → `wireframe.md`, then **stop** — no styling. Defined under "Wireframe first" below. |
| `design <thing>` | The default full flow: wireframe-first tier → pick the mode → build with tokens → validate. |
| `prototype <thing>` | `design` with **throwaway-HTML mode pre-selected** — skip the mode question, build static HTML against `.claude/skills/atelier/styles.css`. |
| `review <files-or-dir>` | Audit only: validate existing files against the brand, report findings, **build nothing**. Defined under "Review" below. |

If the user invokes this skill without any other guidance (bare `design`, or no
action at all), Claude should ask them what they want to build or design, ask
some questions — starting with the interface structure (see "Wireframe first") —
and act as an expert designer who outputs HTML artifacts _or_ production code,
depending on the need.

## Workflow checklist

Copy this checklist into your plan and work it top to bottom — every box, both modes:

```
- [ ] Read .claude/skills/atelier/readme.md (TOC first) + .claude/skills/atelier/components.md
- [ ] Pick the mode: throwaway artifact (static HTML) or production React
      (the `prototype` action pre-picks throwaway — don't re-ask)
- [ ]   Throwaway: link .claude/skills/atelier/styles.css (tokens + webfonts); copy what you need from .claude/skills/atelier/assets/
- [ ]   Production: npm install @raandino/atelier-react @raandino/atelier-tokens; import tokens.css once
- [ ] Wireframe first — structure before style: skip for trivial edits, one-line outline for a
      simple page, full interview + wireframe.md for any new multi-section surface (see below)
- [ ] Build with tokens — var(--brand), var(--cta), var(--font-display)… never raw hex, never gradients
- [ ] Validate: node .claude/skills/atelier/scripts/check.mjs <your-files> — fix every finding, rerun until exit 0
- [ ]   Production React only: also lint with the adherence ruleset (.claude/skills/atelier/_adherence.oxlintrc.json)
- [ ] Visual check: render the result (open the HTML / run the app), screenshot it, and compare
      against "Brand in one breath" below — 40/30/15/10/5 split, glass not gradients, pill
      buttons, Host Grotesk Medium headings / Light body, sentence case
- [ ] Done only when the validator exits 0 AND the screenshot reads as Truora
```

## Wireframe first (structure before style)

This skill styles interfaces; it does not decide their shape. Before any styled
output, make the structure an explicit, user-owned decision — scaled to the ask:

- **Skip** — single components, copy tweaks, edits inside an existing layout.
  Build directly; never tax a trivial request.
- **One-line outline** — a simple page or section. State the assumed structure in
  one line ("Pricing page: header → 3 plan cards → FAQ → CTA band"), let the user
  correct it, build. No file.
- **Full interview → `wireframe.md`** — any new multi-section surface (dashboard,
  console, internal tool, multi-step flow). Run the interview, write
  `wireframe.md`, get confirmation, then style.

**The interview** (fast and opinionated — never a form):

1. Ask **one question per turn**, in dependency order: purpose → users → screens →
   regions per screen → hierarchy (what dominates) → data/content blocks → states
   (empty / loading / error) → density (marketing-airy vs product-dense).
2. Every question ships a **recommended answer** so the user can just say "yes"
   ("How many screens? Recommended: 2 — a list view and a detail drawer.").
3. **Explore instead of asking**: when the answer is derivable from the codebase,
   an existing app, a sketch, or earlier context, state it as an assumption and
   move on. If the user already supplied structure (spec, screenshot, existing
   page), restate it as an outline and skip the questions entirely.
4. If the user refuses ("just build it"), restate a one-line outline as the
   assumed structure and proceed — never block.

**Output contract:** copy `.claude/skills/atelier/wireframe-template.md` to `wireframe.md` at
the consumer project root and fill it in — structure only: screens, a per-screen
region outline, content blocks, states, density. **Zero visual decisions** — no
colors, no fonts, no CSS; any agent can build the layout from it later. If
`wireframe.md` already exists, confirm before overwriting — or write
`wireframe-<surface>.md` for a second surface. In a non-interactive run, fill it
with the recommended answers, mark them as assumptions, and continue. Mirror the
user's language in the interview; keep the file's headings as the template has them.

A filled region outline reads like this (the level of detail to aim for):

```
Operator console — review queue
1. Queue screen: topbar (search, filters) → stats row → case table → bulk-action bar
2. Case detail: drawer over the queue — header (status) → evidence list → decision footer
States: empty queue, loading table, failed evidence fetch · Density: product-dense
```

**The `wireframe` action (forced mode):** invoked as `/atelier wireframe <thing>` —
or any ask that leads with the word "wireframe" — run the interview only: write
`wireframe.md` and stop before any styling. This holds even for a trivial ask:
tiny outline, write the file, stop.

**UI kits are visual reference, not structure:** the `.claude/skills/atelier/ui_kits/` worked
examples show token, glass, and component usage on four very different surfaces.
If you borrow a kit's structure, restate it in the outline and get it confirmed —
never copy a layout silently.

## Validate what you generate (required)

After generating any artifact or component, **execute** the bundled validator — run it,
don't just read it:

```bash
node .claude/skills/atelier/scripts/check.mjs <file-or-dir>
```

It flags gradients, raw brand hex, circular glass, off-system fonts, and glow shadows —
each with `file:line` and a fix hint. Apply the fixes and rerun until it exits 0; never
ship with findings. For **production React**, additionally lint with the brand-adherence
ruleset (ESLint-compatible config — validates component props and bans raw hex/px):

```bash
npx eslint@8 --no-eslintrc -c .claude/skills/atelier/_adherence.oxlintrc.json --ext .jsx,.tsx <src>
```

## Review (the audit-only action)

`/atelier review <files-or-dir>` audits existing files against the brand. It
**builds nothing** — no new artifacts, no rewrites; the deliverable is the report.

1. **Resolve targets:** the paths given. With none: in a git repo, default to the
   changed files (`git diff --name-only` + staged); otherwise ask for a path.
2. **Run the validator** on every target:
   `node .claude/skills/atelier/scripts/check.mjs <files-or-dir>`
3. **React sources** (`.jsx`/`.tsx`) additionally get the adherence ruleset:
   `npx eslint@8 --no-eslintrc -c .claude/skills/atelier/_adherence.oxlintrc.json --ext .jsx,.tsx <src>`
4. **Report** every finding as `file:line — problem — fix hint` (gradients, raw
   brand hex, off-system fonts, circular glass, glow shadows, banned props/px),
   then a one-paragraph verdict: on-brand, or the top fixes in priority order.
   Apply fixes only if the user asks afterwards — that's a follow-up `design`.

## Quick map
- `.claude/skills/atelier/readme.md` — the full design guide: brand context, content + visual
  foundations, iconography, and a file index. **Start here.**
- `.claude/skills/atelier/components.md` — generated component index: every component with its
  description, props, npm import line, and usage-card link.
- `.claude/skills/atelier/styles.css` — single CSS entry point; link it to inherit all tokens + webfonts.
- `.claude/skills/atelier/tokens/` — colors, typography, spacing, fonts, base resets (CSS custom properties).
- `.claude/skills/atelier/assets/` — corrected SVG marks (`svg/`), brand shapes (`shapes/`), product
  icons (`product-icons/`), lifestyle photography (`imagery/`).
- `.claude/skills/atelier/components/` — React primitives: `core/` (Button, IconButton, Badge, Avatar, Card),
  `forms/` (Input, Checkbox, Switch), `navigation/` (Tabs), `brand/` (BrandShape, ProductIcon) —
  each with a `.prompt.md` usage card.
- `.claude/skills/atelier/wireframe-template.md` — structure-only skeleton for the wireframe-first
  interview; copied into the consumer project as `wireframe.md`.
- `.claude/skills/atelier/ui_kits/` — worked examples of the visual language on four very different
  surfaces: `marketing/` (landing page), `dashboard/` (login + operator console),
  `finance/` (reporting panel), `signer/` (e-signature screen). Copy token/glass/component
  usage from them, not page structure.
- `.claude/skills/atelier/scripts/check.mjs` — the brand validator. Run it on everything you generate.
- `.claude/skills/atelier/_adherence.oxlintrc.json` — ESLint brand-adherence ruleset for production React.

## Brand in one breath
Bright, optimistic, **solid-color** tech. Hierarchy: Blanco `#FAFBFF` 40% · **Azul
violeta `#3C1AEA`** 30% (titles, key elements) · Azul medianoche `#01022E` 15% ·
**Naranja `#EE792F`** 10% (CTAs/alerts ONLY) · Azul claro `#9BD2F3` 5%. **Typeface:
Host Grotesk** — Medium headings, Light body. Buttons are pills, flat, no glows.
**Gradients are forbidden** — depth comes from the **Glass Effect** (translucent
rectangles, 20px blur, never circles), floated over warm natural-light photography.
WhatsApp-first product story. Copy is Spanish-first, sentence-case, warm, "tú".