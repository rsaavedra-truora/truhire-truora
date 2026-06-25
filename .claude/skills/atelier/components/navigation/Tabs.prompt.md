Underline tab bar for switching views within a screen.

```jsx
import { Tabs } from '@raandino/atelier-react';
const [tab, setTab] = React.useState('todos');
<Tabs value={tab} onChange={setTab} items={[
  { value:'todos', label:'Todos', badge: 128 },
  { value:'verificados', label:'Verificados', badge: 94 },
  { value:'pendientes', label:'Pendientes', badge: 12 },
]} />
```

Controlled via `value`/`onChange`. Each item: `{ value, label, badge? }`.
