Pill-shaped status / category label; use for verification states, tags, and channel context.

```jsx
import { Badge } from '@raandino/atelier-react';

<Badge tone="success" dot>Verificado</Badge>
<Badge tone="warning" dot>Pendiente</Badge>
<Badge tone="brand">Nuevo</Badge>
<Badge tone="whatsapp" solid>WhatsApp</Badge>
```

Tones: brand · neutral · success · warning · danger · info · whatsapp. `dot` adds a status dot; `solid` fills with the tone color (white text). Soft tint is the default.
