'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/reports': 'Reports',
  '/new-report': 'New Report',
}

export function Header() {
  const pathname = usePathname()

  const title =
    Object.entries(PAGE_TITLES).find(([key]) => pathname === key || pathname.startsWith(key + '/'))?.[1] ??
    'MediReport CMS'

  const now = new Date().toISOString()

  return (
    <header className="flex items-center justify-between border-b border-border bg-card/50 px-6 py-4 backdrop-blur-sm">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground">{formatDate(now)}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {pathname !== '/new-report' && (
          <Link href="/new-report">
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New Report
            </Button>
          </Link>
        )}

        {/* Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary ring-1 ring-primary/30">
          EMS
        </div>
      </div>
    </header>
  )
}
