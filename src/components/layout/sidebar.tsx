'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Briefcase, ClipboardList,
  BarChart2, Star, BookOpen, UsersRound, Settings,
} from 'lucide-react'

interface NavGroup { label?: string; items: NavItem[] }
interface NavItem { label: string; href: string; icon: React.ElementType }

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Reclutamiento',
    items: [
      { label: 'Procesos',    href: '/processes',   icon: Briefcase  },
      { label: 'Candidatos',  href: '/candidates',  icon: Users      },
      { label: 'Talent Pool', href: '/talent-pool', icon: Star       },
    ],
  },
  {
    label: 'Evaluación',
    items: [
      { label: 'Mis entrevistas', href: '/interviews', icon: ClipboardList },
      { label: 'Principles',      href: '/principles', icon: BookOpen      },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { label: 'Métricas', href: '/metrics', icon: BarChart2 },
    ],
  },
]

const SETTINGS_ITEMS: NavItem[] = [
  { label: 'Directorio',     href: '/settings/directory',   icon: UsersRound },
  { label: 'Calibración AI', href: '/settings/calibration', icon: Settings  },
]

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href ||
    (href !== '/dashboard' && !href.includes('/settings') && pathname.startsWith(href + '/'))

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon
    const active = isActive(item.href)

    return (
      <Link
        href={item.href}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          background: active ? 'var(--brand-subtle)' : 'transparent',
          color: active ? 'var(--brand-active)' : 'var(--text-body)',
          font: `${active ? 'var(--weight-medium)' : 'var(--weight-regular)'} 0.9375rem var(--font-sans)`,
          textDecoration: 'none',
          transition: 'background 120ms ease-out',
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = 'var(--surface-sunken)'
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = 'transparent'
        }}
      >
        <Icon
          size={20}
          style={{ color: active ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }}
          strokeWidth={active ? 2 : 1.75}
        />
        {item.label}
      </Link>
    )
  }

  return (
    <aside
      style={{
        width: 244,
        background: 'var(--surface-card)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img
            src="/logo-truora.png"
            alt="Truora"
            style={{ height: 26 }}
            onError={(e) => {
              const t = e.target as HTMLImageElement
              t.style.display = 'none'
            }}
          />
          <span
            style={{
              font: 'var(--weight-medium) 0.6875rem var(--font-sans)',
              letterSpacing: '0.12em',
              color: 'var(--brand)',
            }}
          >
            HIRE
          </span>
        </Link>
      </div>

      {/* Main Nav */}
      <nav style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: group.label ? 16 : 0 }}>
            {group.label && (
              <p
                style={{
                  padding: '8px 12px 6px',
                  margin: 0,
                  font: 'var(--weight-medium) 0.6875rem var(--font-sans)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-subtle)',
                }}
              >
                {group.label}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map(item => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)' }}>
        {SETTINGS_ITEMS.map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>
    </aside>
  )
}
