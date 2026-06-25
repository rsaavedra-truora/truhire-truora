/* Truora marketing site — layout components.
   Primitives come from window.TruoraDesignSystem_8a4443; this file adds the
   marketing-specific sections. Icons are inline Lucide-style (2px stroke). */

const { Button, Badge, Card, Avatar, GlassCard, ProductIcon, BrandShape } = window.TruoraDesignSystem_8a4443;

/* ---------- icons ---------- */
const Svg = (p) => (
  <svg width={p.s || 24} height={p.s || 24} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={p.style}>{p.children}</svg>
);
const IShield = () => <Svg><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></Svg>;
const IPen = () => <Svg><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></Svg>;
const IChat = () => <Svg><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></Svg>;
const ICheck = () => <Svg><path d="M20 6 9 17l-5-5"/></Svg>;
const IArrow = () => <Svg s={20}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></Svg>;
const IBolt = () => <Svg><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></Svg>;
const IGlobe = () => <Svg><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></Svg>;
window.Icons = { IShield, IPen, IChat, ICheck, IArrow, IBolt, IGlobe };

/* ---------- top nav ---------- */
function Nav({ onLogin }) {
  const links = ['Producto', 'Soluciones', 'Precios', 'Desarrolladores', 'Recursos'];
  const [open, setOpen] = React.useState(null);
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: 'rgba(251,250,255,0.82)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '0 28px', height: 72, display: 'flex', alignItems: 'center', gap: 32 }}>
        <img src="../../assets/svg/logo-full.svg" alt="Truora" style={{ height: 30 }} />
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {links.map((l, i) => (
            <a key={l} href="#" onMouseEnter={() => setOpen(i)} onMouseLeave={() => setOpen(null)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', color: open === i ? 'var(--brand)' : 'var(--text-body)', font: 'var(--weight-medium) 0.9375rem var(--font-sans)', background: open === i ? 'var(--brand-subtle)' : 'transparent', transition: 'all var(--dur-fast) var(--ease-out)' }}>{l}</a>
          ))}
        </nav>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onClick={onLogin}>Iniciar sesión</Button>
          <Button variant="primary" size="sm" rightIcon={<IArrow/>}>Empieza gratis</Button>
        </div>
      </div>
    </header>
  );
}

/* ---------- hero ---------- */
function Hero() {
  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '72px 28px 40px', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center' }}>
      <div>
        <Badge tone="brand" dot>Plataforma de adquisición de usuarios</Badge>
        <h1 style={{ font: 'var(--weight-medium) var(--text-4xl)/1.05 var(--font-display)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-strong)', margin: '20px 0 0' }}>
          Convierte más usuarios, con menos fricción
        </h1>
        <p style={{ font: 'var(--weight-light) var(--text-md)/1.5 var(--font-sans)', color: 'var(--text-body)', margin: '20px 0 0', maxWidth: 480 }}>
          Identidad digital, firma electrónica y onboarding — todo en una sola conversación de WhatsApp. Verifica a tus usuarios en segundos, no en días.
        </p>
        <div style={{ display: 'flex', gap: 14, marginTop: 30 }}>
          <Button variant="primary" size="lg" rightIcon={<IArrow/>}>Empieza gratis</Button>
          <Button variant="secondary" size="lg">Agenda una demo</Button>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 30, color: 'var(--text-muted)', font: 'var(--small-font)' }}>
          <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><span style={{ color: 'var(--success)', display: 'inline-flex' }}><ICheck/></span> Sin tarjeta de crédito</span>
          <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><span style={{ color: 'var(--success)', display: 'inline-flex' }}><ICheck/></span> Listo en minutos</span>
        </div>
      </div>
      <WhatsAppDemo />
    </section>
  );
}

/* ---------- whatsapp conversation mock ---------- */
function WhatsAppDemo() {
  const bubbles = [
    { from: 'bot', text: '¡Hola! 👋 Soy el asistente de verificación. Para continuar, ¿me confirmas tu nombre completo?' },
    { from: 'user', text: 'María Camila López' },
    { from: 'bot', text: 'Gracias, María. Toma una foto de tu documento de identidad 📄' },
    { from: 'user', text: '📎 Cédula_frente.jpg' },
    { from: 'bot', text: 'Identidad verificada ✅ Tu cuenta está lista.' },
  ];
  return (
    <div style={{ position: 'relative', justifySelf: 'center' }}>
      <div style={{ position: 'relative', width: 320, background: 'var(--surface-card)', borderRadius: 28, boxShadow: 'var(--shadow-xl)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        <div style={{ background: 'var(--whatsapp-700)', color: '#fff', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="../../assets/svg/icono-light.svg" style={{ width: 20, height: 20 }} alt="" />
          </div>
          <div>
            <div style={{ font: 'var(--weight-bold) 15px var(--font-sans)', whiteSpace: 'nowrap', lineHeight: 1.2 }}>Truora Verify</div>
            <div style={{ font: '12px var(--font-sans)', opacity: 0.85, lineHeight: 1.2 }}>en línea</div>
          </div>
        </div>
        <div style={{ background: '#ECE5DD', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 360 }}>
          {bubbles.map((b, i) => (
            <div key={i} style={{ alignSelf: b.from === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%', background: b.from === 'user' ? '#DCF8C6' : '#fff', color: '#0B141A', padding: '8px 11px', borderRadius: 10, font: '13.5px/1.4 var(--font-sans)', boxShadow: '0 1px 1px rgba(0,0,0,0.08)' }}>
              {b.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- trusted-by strip ---------- */
function TrustStrip() {
  const names = ['Rappi', 'Nubank', 'Bancolombia', 'Mercado Libre', 'Falabella', 'Ualá'];
  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '20px 28px 56px' }}>
      <p style={{ textAlign: 'center', font: 'var(--overline-font)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 22 }}>
        Empresas de toda Latinoamérica confían en Truora
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, opacity: 0.55 }}>
        {names.map(n => <span key={n} style={{ font: 'var(--weight-medium) 22px var(--font-display)', color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>{n}</span>)}
      </div>
    </section>
  );
}

/* ---------- features ---------- */
function Features() {
  const feats = [
    { icon: <ProductIcon name="identidad" color="var(--brand)" size={26} />, title: 'Identidad digital', body: 'Valida documentos, biometría y antecedentes en más de 15 países de la región, en segundos.' },
    { icon: <ProductIcon name="firma" color="var(--brand)" size={26} />, title: 'Firma electrónica', body: 'Contratos y autorizaciones firmados con validez legal, sin salir de la conversación.' },
    { icon: <ProductIcon name="engagement" color="var(--brand)" accent="var(--brand-subtle)" size={26} />, title: 'Onboarding por WhatsApp', body: 'Un flujo conversacional que tus usuarios ya saben usar. Más conversión, menos abandono.' },
  ];
  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '64px 28px' }}>
      <div style={{ maxWidth: 640, marginBottom: 40 }}>
        <div className="over" style={{ font: 'var(--overline-font)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--brand)' }}>Un solo embudo</div>
        <h2 style={{ font: 'var(--weight-medium) var(--text-2xl)/1.12 var(--font-display)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-strong)', margin: '12px 0 0' }}>
          Todo lo que necesitas para conectar con tus usuarios
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
        {feats.map(f => (
          <Card key={f.title} interactive padding="lg">
            <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: 'var(--brand-subtle)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>{f.icon}</div>
            <h3 style={{ font: 'var(--weight-medium) var(--text-md) var(--font-display)', color: 'var(--text-strong)', margin: 0 }}>{f.title}</h3>
            <p style={{ font: 'var(--small-font)', color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.55 }}>{f.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ---------- metrics band ---------- */
function Metrics() {
  const stats = [{ n: '+40%', l: 'conversión en onboarding' }, { n: '38s', l: 'tiempo medio de verificación' }, { n: '15+', l: 'países cubiertos' }, { n: '99.9%', l: 'disponibilidad de la API' }];
  return (
    <section style={{ background: 'var(--brand)', margin: '24px 0' }}>
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '52px 28px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
        {stats.map(s => (
          <div key={s.l} style={{ color: '#fff' }}>
            <div style={{ font: 'var(--weight-medium) var(--text-3xl) var(--font-display)', letterSpacing: 'var(--tracking-tight)' }}>{s.n}</div>
            <div style={{ font: '0.9375rem var(--font-sans)', opacity: 0.88, marginTop: 6 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- glass showcase (brand signature) ---------- */
function GlassShowcase() {
  const Check = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  );
  const Person = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/></svg>
  );
  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '24px 28px 64px', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 48, alignItems: 'center' }}>
      <div>
        <div style={{ font: 'var(--overline-font)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--brand)' }}>Validación en el mundo real</div>
        <h2 style={{ font: 'var(--weight-medium) var(--text-2xl)/1.12 var(--font-display)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-strong)', margin: '12px 0 0' }}>
          Resultados visibles, sin interrumpir a tus usuarios
        </h2>
        <p style={{ font: 'var(--weight-light) var(--text-md)/1.45 var(--font-sans)', color: 'var(--text-body)', margin: '16px 0 0', maxWidth: 420 }}>
          Cada validación — identidad, biometría, antecedentes — aparece como una capa ligera sobre la experiencia real de la persona.
        </p>
      </div>
      <div style={{ position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <img src="../../assets/imagery/lifestyle-desk.webp" alt="Persona trabajando con luz natural" style={{ width: '100%', height: 360, objectFit: 'cover', display: 'block' }} />
        <GlassCard on="photo" radius="sm" padding="sm" style={{ position: 'absolute', top: 18, right: 18, display: 'flex', alignItems: 'center', gap: 10, font: 'var(--weight-medium) 14px var(--font-sans)', color: 'var(--brand)' }}>
          <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 'var(--radius-xs)', background: 'var(--brand)', color: '#fff', alignItems: 'center', justifyContent: 'center' }}>{Check}</span>
          Identidad verificada
        </GlassCard>
        <GlassCard on="photo" radius="sm" padding="sm" style={{ position: 'absolute', bottom: 18, left: 18, display: 'flex', alignItems: 'center', gap: 10, font: 'var(--weight-medium) 14px var(--font-sans)', color: 'var(--brand)' }}>
          <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 'var(--radius-xs)', background: 'var(--brand)', color: '#fff', alignItems: 'center', justifyContent: 'center' }}>{Person}</span>
          Validación biométrica
        </GlassCard>
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */
function CtaBand() {
  return (
    <section style={{ maxWidth: 'var(--container-narrow)', margin: '0 auto', padding: '72px 28px 80px', textAlign: 'center' }}>
      <h2 style={{ font: 'var(--weight-medium) var(--text-3xl)/1.09 var(--font-display)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-strong)', margin: 0 }}>
        Empieza a generar confianza hoy
      </h2>
      <p style={{ font: 'var(--text-md) var(--font-sans)', color: 'var(--text-body)', margin: '16px auto 0', maxWidth: 480 }}>
        Crea tu cuenta gratis y lanza tu primer flujo de verificación en minutos.
      </p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 28 }}>
        <Button variant="primary" size="lg" rightIcon={<IArrow/>}>Empieza gratis</Button>
        <Button variant="whatsapp" size="lg" leftIcon={<IChat/>}>Hablar por WhatsApp</Button>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */
function Footer() {
  const cols = [
    { h: 'Producto', items: ['Identidad', 'Firma electrónica', 'WhatsApp', 'Precios'] },
    { h: 'Desarrolladores', items: ['Documentación', 'Referencia API', 'Estado', 'Changelog'] },
    { h: 'Empresa', items: ['Sobre nosotros', 'Clientes', 'Blog', 'Trabaja con nosotros'] },
  ];
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-card)' }}>
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '48px 28px', display: 'grid', gridTemplateColumns: '1.4fr repeat(3,1fr)', gap: 28 }}>
        <div>
          <img src="../../assets/svg/logo-full.svg" alt="Truora" style={{ height: 28 }} />
          <p style={{ font: 'var(--small-font)', color: 'var(--text-muted)', margin: '16px 0 0', maxWidth: 240 }}>
            Conectamos negocios y usuarios de forma ágil y segura en toda Latinoamérica.
          </p>
        </div>
        {cols.map(c => (
          <div key={c.h}>
            <div style={{ font: 'var(--weight-bold) 0.875rem var(--font-sans)', color: 'var(--text-strong)', marginBottom: 14 }}>{c.h}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.items.map(i => <a key={i} href="#" style={{ font: '0.875rem var(--font-sans)', color: 'var(--text-muted)' }}>{i}</a>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '0 28px 36px', font: 'var(--small-font)', color: 'var(--text-subtle)' }}>
        © 2026 Truora. Todos los derechos reservados.
      </div>
    </footer>
  );
}

Object.assign(window, { Nav, Hero, WhatsAppDemo, TrustStrip, Features, GlassShowcase, Metrics, CtaBand, Footer });
