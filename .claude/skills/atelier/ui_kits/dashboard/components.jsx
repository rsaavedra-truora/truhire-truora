/* Truora product console — layout components.
   Primitives from window.TruoraDesignSystem_8a4443; product-specific UI here. */

const { Button, IconButton, Badge, Avatar, Card, Input, Tabs, Switch, ProductIcon } = window.TruoraDesignSystem_8a4443;

const Svg = (p) => (
  <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={p.style}>{p.children}</svg>
);
const I = {
  grid: <Svg><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></Svg>,
  users: <Svg><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Svg>,
  shield: <Svg><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></Svg>,
  pen: <Svg><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></Svg>,
  chat: <Svg><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></Svg>,
  bars: <Svg><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7"/><rect x="12" y="6" width="3" height="11"/><rect x="17" y="13" width="3" height="4"/></Svg>,
  cog: <Svg><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></Svg>,
  search: <Svg><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Svg>,
  bell: <Svg><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></Svg>,
  plus: <Svg><path d="M5 12h14"/><path d="M12 5v14"/></Svg>,
  arrowUp: <Svg s={16}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></Svg>,
  x: <Svg><path d="M18 6 6 18"/><path d="M6 6l12 12"/></Svg>,
  ext: <Svg s={16}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></Svg>,
};
window.DIcons = I;

/* ---------- sidebar ---------- */
function Sidebar({ active, onNav }) {
  const items = [
    { id: 'overview', label: 'Resumen', icon: I.grid },
    { id: 'users', label: 'Usuarios', icon: I.users },
    { id: 'identity', label: 'Identidad', icon: <ProductIcon name="identidad" color="currentColor" size={20} /> },
    { id: 'signature', label: 'Firmas', icon: <ProductIcon name="firma" color="currentColor" size={20} /> },
    { id: 'flows', label: 'Flujos WhatsApp', icon: <ProductIcon name="engagement" color="currentColor" accent="var(--surface-card)" size={20} /> },
    { id: 'analytics', label: 'Analítica', icon: I.bars },
  ];
  return (
    <aside style={{ width: 244, background: 'var(--surface-card)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', flex: 'none', height: '100%' }}>
      <div style={{ padding: '20px 18px 16px' }}>
        <img src="../../assets/svg/logo-full.svg" alt="Truora" style={{ height: 26 }} />
      </div>
      <nav style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {items.map(it => {
          const on = active === it.id;
          return (
            <button key={it.id} onClick={() => onNav(it.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: on ? 'var(--brand-subtle)' : 'transparent',
              color: on ? 'var(--brand-active)' : 'var(--text-body)',
              font: `${on ? 'var(--weight-semibold)' : 'var(--weight-medium)'} 0.9375rem var(--font-sans)`,
              transition: 'background var(--dur-fast) var(--ease-out)',
            }}>
              <span style={{ display: 'inline-flex', color: on ? 'var(--brand)' : 'var(--text-muted)' }}>{it.icon}</span>
              {it.label}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)' }}>
        <button onClick={() => onNav('settings')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', width: '100%', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: active === 'settings' ? 'var(--brand-subtle)' : 'transparent', color: 'var(--text-body)', font: 'var(--weight-medium) 0.9375rem var(--font-sans)' }}>
          <span style={{ display: 'inline-flex', color: 'var(--text-muted)' }}>{I.cog}</span> Configuración
        </button>
      </div>
    </aside>
  );
}

/* ---------- topbar ---------- */
function Topbar({ title }) {
  return (
    <header style={{ height: 68, borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-card)', display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', flex: 'none' }}>
      <h1 style={{ font: 'var(--weight-medium) var(--text-lg) var(--font-display)', color: 'var(--text-strong)', margin: 0, flex: 1 }}>{title}</h1>
      <div style={{ width: 280 }}>
        <Input placeholder="Buscar usuarios, flujos…" leftAdornment={I.search} style={{ gap: 0 }} />
      </div>
      <IconButton label="Notificaciones" variant="ghost">{I.bell}</IconButton>
      <Avatar name="Carlos Ruiz" status="online" />
    </header>
  );
}

/* ---------- stat card ---------- */
function StatCard({ label, value, delta, tone = 'brand' }) {
  return (
    <Card padding="md">
      <div style={{ font: 'var(--small-font)', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
        <span style={{ font: 'var(--weight-medium) var(--text-2xl) var(--font-display)', color: 'var(--text-strong)', letterSpacing: 'var(--tracking-tight)' }}>{value}</span>
        {delta ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, font: 'var(--weight-bold) 0.8125rem var(--font-sans)', color: 'var(--success)' }}>
            {I.arrowUp}{delta}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

/* ---------- verifications table ---------- */
const ROWS = [
  { name: 'María Camila López', doc: 'CC 1.024.xxx.xxx', country: '🇨🇴 Colombia', channel: 'WhatsApp', status: 'verified', time: 'hace 2 min' },
  { name: 'João Pedro Alves', doc: 'CPF 123.xxx.xxx-09', country: '🇧🇷 Brasil', channel: 'WhatsApp', status: 'verified', time: 'hace 8 min' },
  { name: 'Sofía Martínez', doc: 'DNI 38.xxx.xxx', country: '🇦🇷 Argentina', channel: 'Web', status: 'pending', time: 'hace 12 min' },
  { name: 'Diego Fernández', doc: 'RUT 18.xxx.xxx-2', country: '🇨🇱 Chile', channel: 'WhatsApp', status: 'verified', time: 'hace 21 min' },
  { name: 'Valentina Rojas', doc: 'CC 1.099.xxx.xxx', country: '🇨🇴 Colombia', channel: 'WhatsApp', status: 'rejected', time: 'hace 34 min' },
  { name: 'Mateo Gómez', doc: 'CURP GOXX9xxxxx', country: '🇲🇽 México', channel: 'Web', status: 'pending', time: 'hace 1 h' },
];
const STATUS = {
  verified: { tone: 'success', label: 'Verificado' },
  pending: { tone: 'warning', label: 'Pendiente' },
  rejected: { tone: 'danger', label: 'Rechazado' },
};

function VerificationsTable({ onRow }) {
  const [tab, setTab] = React.useState('todos');
  const counts = { todos: ROWS.length, verified: ROWS.filter(r=>r.status==='verified').length, pending: ROWS.filter(r=>r.status==='pending').length, rejected: ROWS.filter(r=>r.status==='rejected').length };
  const rows = tab === 'todos' ? ROWS : ROWS.filter(r => r.status === tab);
  return (
    <Card padding="sm" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '6px 8px 0' }}>
        <Tabs value={tab} onChange={setTab} items={[
          { value: 'todos', label: 'Todos', badge: counts.todos },
          { value: 'verified', label: 'Verificados', badge: counts.verified },
          { value: 'pending', label: 'Pendientes', badge: counts.pending },
          { value: 'rejected', label: 'Rechazados', badge: counts.rejected },
        ]} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: '0.9375rem var(--font-sans)' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-subtle)', font: 'var(--weight-semibold) 0.75rem var(--font-sans)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)' }}>
            <th style={{ padding: '14px 14px 10px' }}>Usuario</th>
            <th style={{ padding: '14px 14px 10px' }}>País</th>
            <th style={{ padding: '14px 14px 10px' }}>Canal</th>
            <th style={{ padding: '14px 14px 10px' }}>Estado</th>
            <th style={{ padding: '14px 14px 10px', textAlign: 'right' }}>Cuándo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} onClick={() => onRow(r)} style={{ cursor: 'pointer', borderTop: '1px solid var(--border-subtle)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-sunken)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={r.name} size="sm" />
                  <div>
                    <div style={{ font: 'var(--weight-semibold) 0.9375rem var(--font-sans)', color: 'var(--text-strong)' }}>{r.name}</div>
                    <div style={{ font: '0.8125rem var(--font-mono)', color: 'var(--text-muted)' }}>{r.doc}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px 14px', color: 'var(--text-body)' }}>{r.country}</td>
              <td style={{ padding: '12px 14px' }}>
                {r.channel === 'WhatsApp'
                  ? <Badge tone="whatsapp" dot>WhatsApp</Badge>
                  : <Badge tone="neutral">Web</Badge>}
              </td>
              <td style={{ padding: '12px 14px' }}><Badge tone={STATUS[r.status].tone} dot>{STATUS[r.status].label}</Badge></td>
              <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-muted)', font: '0.875rem var(--font-sans)' }}>{r.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ---------- user detail drawer ---------- */
function UserDrawer({ row, onClose }) {
  if (!row) return null;
  const st = STATUS[row.status];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(7,0,26,0.5)', backdropFilter: 'blur(2px)', animation: 'tru-fade var(--dur-base) var(--ease-out)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 400, background: 'var(--surface-card)', boxShadow: 'var(--shadow-xl)', padding: 24, overflowY: 'auto', animation: 'tru-slide var(--dur-slow) var(--ease-out)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Avatar name={row.name} size="xl" status="online" />
          <IconButton label="Cerrar" variant="ghost" onClick={onClose}>{I.x}</IconButton>
        </div>
        <h2 style={{ font: 'var(--weight-medium) var(--text-xl) var(--font-display)', color: 'var(--text-strong)', margin: '16px 0 4px' }}>{row.name}</h2>
        <div style={{ font: '0.875rem var(--font-mono)', color: 'var(--text-muted)' }}>{row.doc}</div>
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <Badge tone={st.tone} dot>{st.label}</Badge>
          {row.channel === 'WhatsApp' ? <Badge tone="whatsapp" dot>WhatsApp</Badge> : <Badge tone="neutral">Web</Badge>}
        </div>
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '20px 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[['Documento de identidad','Validado · 99.4% confianza'],['Biometría facial','Coincidencia confirmada'],['Antecedentes','Sin hallazgos'],['Firma electrónica','Contrato firmado · válido']].map(([k,v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: '0.9375rem var(--font-sans)', color: 'var(--text-body)' }}>{k}</span>
              <span style={{ font: 'var(--weight-medium) 0.875rem var(--font-sans)', color: row.status==='rejected' && k.includes('Documento') ? 'var(--danger)' : 'var(--success)' }}>{row.status==='rejected' && k.includes('Documento') ? 'No legible' : v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
          <Button variant="primary" fullWidth>Ver expediente</Button>
          <Button variant="secondary" leftIcon={I.ext}>API</Button>
        </div>
      </div>
    </div>
  );
}

window.DB = { Sidebar, Topbar, StatCard, VerificationsTable, UserDrawer };
