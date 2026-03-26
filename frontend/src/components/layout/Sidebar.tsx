'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Activity,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/new-report', icon: PlusCircle, label: 'New Report' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground tracking-tight">MediReport</p>
          <p className="text-xs text-muted-foreground">CMS v2.0</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={cn(
                  'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 h-full w-0.5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.href === '/new-report' && (
                  <span className="ml-auto rounded-full bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                    AI
                  </span>
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          <Shield className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-medium text-foreground">HIPAA Compliant</p>
            <p className="text-xs text-muted-foreground">End-to-end encrypted</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
