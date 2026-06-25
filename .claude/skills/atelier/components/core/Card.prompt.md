White surface container for grouped content — soft shadow, rounded, hairline border.

```jsx
import { Card } from '@raandino/atelier-react';

<Card padding="lg">…</Card>
<Card interactive onClick={open}>Clickable card lifts on hover</Card>
```

Props: `padding` sm/md/lg, `interactive` (hover-lift), `elevated` (toggle shadow). Don't add colored left-border accents — elevation is shadow-only.
