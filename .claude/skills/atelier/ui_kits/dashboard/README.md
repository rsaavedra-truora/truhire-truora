# Product console — worked example

A recreation of the **Truora product dashboard** (the operator console where teams
manage verification, identity, signature, and WhatsApp onboarding flows). Built
entirely from design-system primitives (`Button`, `IconButton`, `Badge`, `Avatar`,
`Card`, `Input`, `Tabs`, `Switch`). Every color, type, radius, and shadow value
comes from the design-system tokens; only layout is local — copy the visual
usage, not the page structure.

**Interactive flow** (runnable preview in the Atelier repo showcase):
1. **Login** (`login.jsx`) — split layout, email/password + "Continuar por WhatsApp".
   Any submit signs you in.
2. **Console** — `Sidebar` nav + `Topbar` (search, notifications, avatar).
   - **Resumen** view: four `StatCard`s + a `VerificationsTable` with status `Tabs`.
   - Click any table row → **`UserDrawer`** slides in with the verification detail.
   - Other nav items render a placeholder noting they reuse the same components.

Files: `login.jsx` (→ `window.LoginScreen`), `components.jsx`
(→ `window.DB = { Sidebar, Topbar, StatCard, VerificationsTable, UserDrawer }`,
plus `window.DIcons`). Spanish-first, sentence-case copy.
