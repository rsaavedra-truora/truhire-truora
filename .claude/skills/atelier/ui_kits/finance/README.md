# Finance dashboard — worked example

A **Truora finance reporting panel** (revenue + customer-acquisition cost, month
over month). Static HTML + CSS — every color, type, radius, and shadow value comes
from the design-system tokens; only layout is local.

**Screen:** `index.html` — single page:
`Topbar` (logo, period pill-select, export CTA) → heading → four KPI cards
(revenue, CAC, new customers, LTV:CAC) → two SVG chart cards (monthly revenue
bars, CAC evolution line) → midnight glass band (semester summary with the
flower brand shape) → monthly detail table with success/warning badges.

Run by opening `index.html` over HTTP (it links `../../styles.css`). Spanish-first
copy, sentence-case. Demo data only.
