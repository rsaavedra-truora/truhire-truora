Checkbox with optional inline label; violet fill + white check when on.

```jsx
import { Checkbox } from '@raandino/atelier-react';
const [ok, setOk] = React.useState(false);
<Checkbox checked={ok} onChange={e => setOk(e.target.checked)} label="Acepto los términos" />
```

Controlled component. Pass `disabled` to dim + lock.
