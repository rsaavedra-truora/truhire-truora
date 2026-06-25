/* Truora console — login / sign-in screen. */
const { Button, Input, Checkbox, GlassCard } = window.TruoraDesignSystem_8a4443;

function LoginScreen({ onLogin }) {
  const [email, setEmail] = React.useState('carlos@empresa.com');
  const [pwd, setPwd] = React.useState('••••••••');
  const [remember, setRemember] = React.useState(true);
  const Wa = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', background: 'var(--surface-card)' }}>
      {/* form side */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8%', maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <img src="../../assets/svg/logo-full.svg" alt="Truora" style={{ height: 30, alignSelf: 'flex-start' }} />
        <h1 style={{ font: 'var(--weight-medium) var(--text-2xl)/1.12 var(--font-display)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-strong)', margin: '40px 0 6px' }}>
          Bienvenido de vuelta
        </h1>
        <p style={{ font: 'var(--body-font)', color: 'var(--text-muted)', margin: '0 0 28px' }}>
          Ingresa a tu consola de Truora.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Input label="Correo de trabajo" value={email} onChange={e=>setEmail(e.target.value)} />
          <Input label="Contraseña" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Checkbox checked={remember} onChange={e=>setRemember(e.target.checked)} label="Recordarme" />
            <a href="#" style={{ font: 'var(--weight-medium) 0.875rem var(--font-sans)', color: 'var(--text-link)' }}>¿Olvidaste tu contraseña?</a>
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={onLogin}>Iniciar sesión</Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-subtle)', font: 'var(--small-font)' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} /> o <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>
          <Button variant="whatsapp" size="lg" fullWidth leftIcon={Wa} onClick={onLogin}>Continuar por WhatsApp</Button>
        </div>
        <p style={{ font: 'var(--small-font)', color: 'var(--text-muted)', marginTop: 28 }}>
          ¿No tienes cuenta? <a href="#" style={{ color: 'var(--text-link)', fontWeight: 'var(--weight-semibold)' }}>Empieza gratis</a>
        </p>
      </div>
      {/* brand side — photo + Glass Effect (manual: interfaz flotante) */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--midnight)' }}>
        <img src="../../assets/imagery/lifestyle-sofa.webp" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(1,2,46,0.30)' }} />
        <GlassCard on="photo" radius="sm" padding="sm" style={{ position: 'absolute', top: 28, right: 28, display: 'flex', alignItems: 'center', gap: 10, font: 'var(--weight-medium) 14px var(--font-sans)', color: 'var(--brand)' }}>
          <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 'var(--radius-xs)', background: 'var(--brand)', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </span>
          Identidad verificada
        </GlassCard>
        <GlassCard on="dark" padding="lg" style={{ position: 'absolute', left: 28, right: 28, bottom: 28 }}>
          <div style={{ font: 'var(--overline-font)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', opacity: 0.85 }}>Truora Console</div>
          <h2 style={{ font: 'var(--weight-medium) var(--text-xl)/1.15 var(--font-display)', margin: '10px 0 0', color: 'var(--neutral-25)' }}>
            Confianza ágil y segura, en cada conexión
          </h2>
          <p style={{ font: 'var(--weight-light) 15px/1.4 var(--font-sans)', opacity: 0.92, margin: '10px 0 0' }}>
            Gestiona identidad, firma y onboarding de tus usuarios desde un solo lugar.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
window.LoginScreen = LoginScreen;
