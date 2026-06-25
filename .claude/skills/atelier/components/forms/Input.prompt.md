Labeled text field with helper/error text and optional adornments.

```jsx
import { Input } from '@raandino/atelier-react';

<Input label="Correo" placeholder="tu@empresa.com" hint="Te enviaremos el acceso aquí" />
<Input label="Teléfono" leftAdornment={<span>+57</span>} error="Número inválido" />
```

Props: `label`, `hint`, `error` (danger state), `leftAdornment`/`rightAdornment`, plus standard input props. Single border — it turns violet on focus (no rings, no double borders).
