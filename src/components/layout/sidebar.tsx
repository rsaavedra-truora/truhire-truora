'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/types'
import {
  LayoutDashboard, Users, Briefcase, ClipboardList,
  BarChart2, Settings, Star, BookOpen, UsersRound,
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
      { label: 'Procesos', href: '/processes', icon: Briefcase, roles: ['recruiter','hiring_manager','sponsor','head_of_people'] },
      { label: 'Candidatos', href: '/candidates', icon: Users, roles: ['recruiter','head_of_people'] },
      { label: 'Talent Pool', href: '/talent-pool', icon: Star, roles: ['recruiter','head_of_people'] },
    ],
  },
  {
    label: 'Evaluación',
    items: [
      { label: 'Mis entrevistas', href: '/interviews', icon: ClipboardList, roles: ['interviewer','bar_raiser','hiring_manager','sponsor','recruiter','head_of_people'] },
      { label: 'Principles', href: '/principles', icon: BookOpen, roles: ['recruiter','hiring_manager','sponsor','interviewer','bar_raiser','head_of_people'] },
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
      { label: 'Directorio', href: '/settings/directory', icon: UsersRound, roles: ['recruiter', 'head_of_people'] },
      { label: 'Calibración AI', href: '/settings/calibration', icon: BarChart2, roles: ['recruiter', 'head_of_people'] },
    ],
  },
]

export function Sidebar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <Link href="/dashboard" className="h-14 flex items-center px-5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
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
          <div className="hidden w-6 h-6 rounded-md items-center justify-center flex-shrink-0 bg-[#0800FF]">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="text-xs font-bold tracking-widest text-[#0800FF]">HIRE</span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {NAV_GROUPS.map((group, gi) => {
          const visible = group.items.filter(i => i.roles.includes(userRole))
          if (!visible.length) return null
          return (
            <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
              {group.label && (
                <p className="px-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  {group.label}
                </p>
              )}
              {visible.map(item => {
                const Icon = item.icon
                // Exact match, o startsWith solo si no hay otro nav item más específico que también coincida
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' &&
                   !item.href.includes('/settings') && // /settings y sus hijos usan solo exact match
                   pathname.startsWith(item.href + '/'))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                      isActive
                        ? 'bg-[#E5E4FF] text-[#0800FF] font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={14} className={`flex-shrink-0 ${isActive ? 'text-[#0800FF]' : 'text-gray-400'}`} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="px-5 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">TruHire v1.0</p>
      </div>
    </aside>
  )
}
