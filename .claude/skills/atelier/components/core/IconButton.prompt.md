Square icon-only button for toolbars and dense controls.

```jsx
import { IconButton } from '@raandino/atelier-react';

<IconButton label="Buscar" variant="ghost"><SearchIcon/></IconButton>
<IconButton label="Más" variant="subtle"><MoreIcon/></IconButton>
```

Always pass `label` (becomes aria-label + title). Variants primary/secondary/ghost/subtle; sizes sm/md/lg.
