'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/types'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardList,
  BarChart2,
  Settings,
  Star,
  BookOpen,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: UserRole[] // qué roles ven este item
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['recruiter', 'hiring_manager', 'sponsor', 'interviewer', 'bar_raiser', 'head_of_people'],
  },
  {
    label: 'Procesos',
    href: '/processes',
    icon: Briefcase,
    roles: ['recruiter', 'hiring_manager', 'sponsor', 'head_of_people'],
  },
  {
    label: 'Candidatos',
    href: '/candidates',
    icon: Users,
    roles: ['recruiter', 'head_of_people'],
  },
  {
    label: 'Mis entrevistas',
    href: '/interviews',
    icon: ClipboardList,
    roles: ['interviewer', 'bar_raiser', 'hiring_manager', 'sponsor'],
  },
  {
    label: 'Talent Pool',
    href: '/talent-pool',
    icon: Star,
    roles: ['recruiter', 'head_of_people'],
  },
  {
    label: 'Principles',
    href: '/principles',
    icon: BookOpen,
    roles: ['recruiter', 'hiring_manager', 'sponsor', 'interviewer', 'bar_raiser', 'head_of_people'],
  },
  {
    label: 'Métricas',
    href: '/metrics',
    icon: BarChart2,
    roles: ['recruiter', 'head_of_people'],
  },
  {
    label: 'Configuración',
    href: '/settings',
    icon: Settings,
    roles: ['head_of_people'],
  },
]

interface SidebarProps {
  userRole: UserRole
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  )

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0800FF] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">TruHire</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-100
                ${
                  isActive
                    ? 'bg-[#E8E7FF] text-[#0800FF]'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <Icon
                className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#0800FF]' : 'text-gray-400'}`}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer: versión */}
      <div className="px-5 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">TruHire v1.0</p>
      </div>
    </aside>
  )
}
