On/off toggle for instant-apply settings; violet track + spring knob.

```jsx
import { Switch } from '@raandino/atelier-react';
const [on, setOn] = React.useState(true);
<Switch checked={on} onChange={e => setOn(e.target.checked)} label="Notificaciones por WhatsApp" />
```

Sizes sm/md. Controlled. Use for settings, not form submit.
