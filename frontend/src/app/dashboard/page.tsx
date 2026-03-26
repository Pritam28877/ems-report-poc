'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  PlusCircle,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ReportTable } from '@/components/reports/ReportTable'
import { useReports } from '@/hooks/useReports'
import { formatDateShort } from '@/lib/utils'

const today = formatDateShort(new Date().toISOString())

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  description,
  delay = 0,
}: {
  title: string
  value: number | string
  icon: React.ElementType
  color: string
  description?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {title}
              </p>
              <p className="text-3xl font-bold text-foreground">{value}</p>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
            <div className={`rounded-xl p-2.5 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
        <div className={`absolute bottom-0 left-0 h-0.5 w-full ${color.replace('bg-', 'bg-').replace('/10', '/30')}`} />
      </Card>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useReports({ per_page: 100 })
  const { data: recentData, isLoading: recentLoading } = useReports({ per_page: 5 })

  const reports = data?.reports ?? []
  const totalReports = data?.total ?? 0

  // Compute stats from real data
  const todayReports = reports.filter((r) => {
    return formatDateShort(r.created_at) === today
  }).length

  const drafts = reports.filter((r) => r.status === 'draft').length
  const submitted = reports.filter((r) => r.status === 'submitted').length
  const alertReports = reports.filter((r) => r.ai_alert).length

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load dashboard data</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top CTA */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Overview{' '}
            <span className="text-gradient-cyan">Dashboard</span>
          </h2>
          <p className="text-sm text-muted-foreground">Real-time ambulance report monitoring</p>
        </div>
        <Link href="/new-report">
          <Button className="gap-2" size="lg">
            <PlusCircle className="h-4 w-4" />
            New Report
          </Button>
        </Link>
      </motion.div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Reports"
            value={totalReports}
            icon={FileText}
            color="bg-primary/10 text-primary"
            description="All time"
            delay={0}
          />
          <StatCard
            title="Today's Reports"
            value={todayReports}
            icon={Calendar}
            color="bg-blue-400/10 text-blue-400"
            description={today}
            delay={0.05}
          />
          <StatCard
            title="Drafts"
            value={drafts}
            icon={Clock}
            color="bg-yellow-400/10 text-yellow-400"
            description="Pending completion"
            delay={0.1}
          />
          <StatCard
            title="Submitted"
            value={submitted}
            icon={CheckCircle2}
            color="bg-green-400/10 text-green-400"
            description="Finalized reports"
            delay={0.15}
          />
        </div>
      )}

      {/* Alert banner */}
      {alertReports > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-3"
        >
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">
            <span className="font-semibold">{alertReports} report{alertReports > 1 ? 's' : ''}</span> with clinical alerts require attention
          </p>
          <Link href="/reports?status=all" className="ml-auto">
            <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive">
              View All
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Recent reports */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recent Reports
            </CardTitle>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="text-xs">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <ReportTable reports={recentData?.reports ?? []} isLoading={recentLoading} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
