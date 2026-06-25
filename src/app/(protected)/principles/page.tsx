import Link from 'next/link'
import { TRUORA_PRINCIPLES, DIMENSION_COLORS, ANTIVALOR_COLORS } from '@/lib/principles-data'

export const metadata = { title: 'Truora Principles' }

const DIMENSION_GROUPS = [
  { key: 'caracter', label: 'Carácter', subtitle: 'Quién eres — no se enseña fácilmente, es lo primero que filtramos.' },
  { key: 'capacidad', label: 'Capacidad', subtitle: 'Cómo piensas — se puede desarrollar, pero requiere base mínima desde el día uno.' },
  { key: 'mentalidad-startup', label: 'Mentalidad startup', subtitle: 'Por qué Truora — qué tipo de empresa quieren construir.' },
]

export default function PrinciplesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Truora Principles</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Los 8 criterios que usamos para contratar, evaluar y promover. No son aspiraciones — son el estándar operativo.
          Cada principio tiene su anti-valor: saber qué evitamos es tan importante como saber qué buscamos.
        </p>
      </div>

      {/* Principles by dimension */}
      {DIMENSION_GROUPS.map(dim => {
        const principles = TRUORA_PRINCIPLES.filter(p => p.dimension === dim.key)
        const colors = DIMENSION_COLORS[dim.key as keyof typeof DIMENSION_COLORS]
        return (
          <div key={dim.key}>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                  {dim.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{dim.subtitle}</p>
            </div>
            <div className="grid gap-3">
              {principles.map(p => (
                <Link
                  key={p.slug}
                  href={`/principles/${p.slug}`}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-truora-primary hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{p.id}</span>
                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-truora-primary transition-colors">
                          {p.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{p.definition}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ANTIVALOR_COLORS[p.antivalorType].bg} ${ANTIVALOR_COLORS[p.antivalorType].text}`}>
                        vs. {p.antivalor}
                      </span>
                      <p className="text-xs text-gray-400 mt-2 max-w-[180px]">{p.predicts}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}

      {/* Anti-valores — al final, con branding Truora */}
      <div className="border-t border-gray-200 pt-8">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Los tres anti-valores</h2>
          <p className="text-sm text-gray-500 mt-1">
            Cada principio tiene un opuesto. Cuando alguien opera consistentemente desde uno de estos, es señal de que no encaja con cómo trabajamos.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl p-4" style={{ background: '#FEE2E2' }}>
            <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>Entitlement</p>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#7F1D1D', opacity: 0.85 }}>
              Espera que le asignen, expliquen y den recursos antes de moverse. No actúa sin instrucción.
            </p>
            <p className="text-xs mt-2 font-medium" style={{ color: '#991B1B' }}>
              Opuesto a: Ownership · Agencia
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#FECACA' }}>
            <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>Sloppiness</p>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#7F1D1D', opacity: 0.85 }}>
              Baja el estándar cuando las cosas se ponen difíciles. Ejecuta sin entender si mueve la aguja correcta.
            </p>
            <p className="text-xs mt-2 font-medium" style={{ color: '#991B1B' }}>
              Opuesto a: Grit · Pensamiento analítico · Velocidad
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: '#FCA5A5' }}>
            <p className="text-sm font-semibold" style={{ color: '#7F1D1D' }}>Politics</p>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#7F1D1D', opacity: 0.85 }}>
              Dice lo que la gente quiere escuchar para mantener su posición. Ambigüedad como escudo.
            </p>
            <p className="text-xs mt-2 font-medium" style={{ color: '#7F1D1D' }}>
              Opuesto a: Confianza · Comunicación estructurada
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
