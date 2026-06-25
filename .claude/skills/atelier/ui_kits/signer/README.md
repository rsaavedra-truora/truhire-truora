# Signer flow — worked example

An **e-signature signer screen** (ZapSign-style structure, Truora skin): the page
a signer lands on to review and sign a contract. Static HTML + CSS + vanilla JS —
every color, type, radius, and shadow value comes from the design-system tokens;
only layout is local.

**Screen:** `index.html` — single page:
`Header` (logo, signature-status pill, download) → thumbnail sidebar (5 pages,
scroll-synced active state) → document viewport (skeleton contract pages with
clause anchors + signature slot) → floating **glass** zoom controls →
"Pregúntale a tu documento" FAB that opens a simulated doc-chat drawer whose
answers cite clauses and scroll/flash them in the document → footer (trust note,
language select, Continuar CTA).

Run by opening `index.html` over HTTP (it links `../../styles.css`). Spanish-first
copy, sentence-case. Chat answers are simulated demo data.
