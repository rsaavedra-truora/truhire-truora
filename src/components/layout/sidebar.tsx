'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/types'
import {
  LayoutDashboard, Users, Briefcase, ClipboardList,
  BarChart2, Star, BookOpen, UsersRound,
} from 'lucide-react'

interface NavGroup { label?: string; items: NavItem[] }
interface NavItem { label: string; href: string; icon: React.ElementType; roles: UserRole[] }

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['recruiter','hiring_manager','sponsor','interviewer','bar_raiser','head_of_people'] },
    ],
  },
  {
    label: 'Reclutamiento',
    items: [
      { label: 'Procesos',    href: '/processes',   icon: Briefcase,    roles: ['recruiter','hiring_manager','sponsor','head_of_people'] },
      { label: 'Candidatos',  href: '/candidates',  icon: Users,        roles: ['recruiter','head_of_people'] },
      { label: 'Talent Pool', href: '/talent-pool', icon: Star,         roles: ['recruiter','head_of_people'] },
    ],
  },
  {
    label: 'Evaluación',
    items: [
      { label: 'Mis entrevistas', href: '/interviews', icon: ClipboardList, roles: ['interviewer','bar_raiser','hiring_manager','sponsor','recruiter','head_of_people'] },
      { label: 'Principles',      href: '/principles', icon: BookOpen,      roles: ['recruiter','hiring_manager','sponsor','interviewer','bar_raiser','head_of_people'] },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { label: 'Métricas', href: '/metrics', icon: BarChart2, roles: ['recruiter','head_of_people'] },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Directorio',    href: '/settings/directory',   icon: UsersRound, roles: ['recruiter','head_of_people'] },
      { label: 'Calibración AI', href: '/settings/calibration', icon: BarChart2,  roles: ['recruiter','head_of_people'] },
    ],
  },
]

export function Sidebar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname()

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col"
      style={{
        background: 'var(--truora-bg)',
        borderRight: '1px solid var(--truora-line)',
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="h-14 flex items-center px-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--truora-line)' }}
      >
        <div className="flex items-center gap-2">
          <img
            src="/logo-truora.png"
            alt="Truora"
            className="h-5 w-auto"
            onError={(e) => {
              const t = e.target as HTMLImageElement
              t.style.display = 'none'
              const fb = t.nextElementSibling as HTMLElement
              if (fb) fb.style.display = 'flex'
            }}
          />
          {/* Fallback cuando no carga la imagen */}
          <div
            className="hidden w-6 h-6 rounded-md items-center justify-center flex-shrink-0"
            style={{ background: 'var(--truora-primary)' }}
          >
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: 'var(--truora-primary)' }}
          >
            HIRE
          </span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map((group, gi) => {
          const visible = group.items.filter(i => i.roles.includes(userRole))
          if (!visible.length) return null
          return (
            <div key={gi}>
              {group.label && (
                <p
                  className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: 'var(--truora-ink-subtle)' }}
                >
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map(item => {
                  const Icon = item.icon
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' &&
                     !item.href.includes('/settings') &&
                     pathname.startsWith(item.href + '/'))

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors"
                      style={
                        isActive
                          ? {
                              background: 'var(--truora-primary-soft)',
                              color: 'var(--truora-primary)',
                              fontWeight: 600,
                            }
                          : {
                              color: 'var(--truora-ink-muted)',
                            }
                      }
                      onMouseEnter={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLAnchorElement).style.background = 'var(--truora-bg-soft)'
                          ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--truora-ink)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                          ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--truora-ink-muted)'
                        }
                      }}
                    >
                      <Icon
                        size={15}
                        className="flex-shrink-0"
                        style={{ color: isActive ? 'var(--truora-primary)' : 'var(--truora-ink-subtle)' }}
                        strokeWidth={isActive ? 2 : 1.75}
                      />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-3"
        style={{ borderTop: '1px solid var(--truora-line)' }}
      >
        <p className="text-xs" style={{ color: 'var(--truora-ink-subtle)' }}>
          TruHire v1.0
        </p>
      </div>
    </aside>
  )
}
