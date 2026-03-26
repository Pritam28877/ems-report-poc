'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, User, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatTimeAgo, getIncidentTypeColor, getStatusColor, capitalize } from '@/lib/utils'
import type { Report } from '@/lib/types'

interface ReportCardProps {
  report: Report
  index?: number
}

export function ReportCard({ report, index = 0 }: ReportCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/reports/${report.id}`}>
        <Card className="group cursor-pointer transition-all hover:border-primary/30 hover:bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', getIncidentTypeColor(report.incident_type))}>
                    {capitalize(report.incident_type ?? 'Unknown')}
                  </span>
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', getStatusColor(report.status))}>
                    {capitalize(report.status)}
                  </span>
                  {report.ai_alert && (
                    <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                      ALERT
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {report.patient_name ?? 'Unknown Patient'}
                  {report.patient_age && <span className="text-muted-foreground">({report.patient_age})</span>}
                </div>

                {report.location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {report.location}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-muted-foreground">{formatTimeAgo(report.created_at)}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
