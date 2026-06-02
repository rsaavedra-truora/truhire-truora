'use client'

/**
 * Selector de calificación por principio.
 * Muy fuerte / Fuerte → Fortaleza
 * Débil / Muy débil → Debilidad
 */

export type PrincipleRating = 'muy_fuerte' | 'fuerte' | 'intermedio' | 'debil' | 'muy_debil'

export const RATING_CONFIG: Record<PrincipleRating, {
  label: string
  shortLabel: string
  icon: string
  isStrength: boolean | null // null = neutro
  bg: string
  selectedBg: string
  text: string
  selectedText: string
  border: string
}> = {
  muy_fuerte: {
    label: 'Muy fuerte',
    shortLabel: 'Muy fuerte',
    icon: '↑↑',
    isStrength: true,
    bg: 'bg-white',
    selectedBg: 'bg-green-600',
    text: 'text-green-700',
    selectedText: 'text-white',
    border: 'border-green-400',
  },
  fuerte: {
    label: 'Fuerte',
    shortLabel: 'Fuerte',
    icon: '↑',
    isStrength: true,
    bg: 'bg-white',
    selectedBg: 'bg-green-400',
    text: 'text-green-600',
    selectedText: 'text-white',
    border: 'border-green-300',
  },
  intermedio: {
    label: 'Intermedio',
    shortLabel: 'Intermedio',
    icon: '→',
    isStrength: null,
    bg: 'bg-white',
    selectedBg: 'bg-blue-400',
    text: 'text-blue-600',
    selectedText: 'text-white',
    border: 'border-blue-300',
  },
  debil: {
    label: 'Débil',
    shortLabel: 'Débil',
    icon: '↓',
    isStrength: false,
    bg: 'bg-white',
    selectedBg: 'bg-red-400',
    text: 'text-red-500',
    selectedText: 'text-white',
    border: 'border-red-300',
  },
  muy_debil: {
    label: 'Muy débil',
    shortLabel: 'Muy débil',
    icon: '↓↓',
    isStrength: false,
    bg: 'bg-white',
    selectedBg: 'bg-red-600',
    text: 'text-red-700',
    selectedText: 'text-white',
    border: 'border-red-400',
  },
}

export function RatingBadge({ rating }: { rating: PrincipleRating | string | null | undefined }) {
  if (!rating) return <span className="text-xs text-gray-300">—</span>
  const config = RATING_CONFIG[rating as PrincipleRating]
  if (!config) return <span className="text-xs text-gray-400">{rating}</span>
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${config.selectedBg} ${config.selectedText}`}>
      <span>{config.icon}</span>
      {config.shortLabel}
    </span>
  )
}

interface PrincipleRatingSelectorProps {
  slug: string
  value: PrincipleRating | null
  onChange: (slug: string, rating: PrincipleRating) => void
  disabled?: boolean
}

export function PrincipleRatingSelector({ slug, value, onChange, disabled }: PrincipleRatingSelectorProps) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">Calificación de este principio</p>
      <div className="grid grid-cols-5 gap-2">
        {(Object.entries(RATING_CONFIG) as [PrincipleRating, typeof RATING_CONFIG[PrincipleRating]][]).map(([key, config]) => {
          const isSelected = value === key
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(slug, key)}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all text-center ${
                isSelected
                  ? `${config.selectedBg} ${config.selectedText} border-transparent`
                  : `bg-white border-gray-200 hover:border-gray-300 ${config.text}`
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="text-base font-bold leading-none">{config.icon}</span>
              <span className="text-xs font-medium leading-tight">{config.label}</span>
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-green-600 font-medium">← Fortaleza</span>
        <span className="text-xs text-blue-500 font-medium">Intermedio</span>
        <span className="text-xs text-red-500 font-medium">Debilidad →</span>
      </div>
    </div>
  )
}
