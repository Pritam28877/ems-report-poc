'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, AlertTriangle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatTimeAgo, getIncidentTypeColor, getStatusColor, capitalize } from '@/lib/utils'
import type { Report } from '@/lib/types'

interface ReportTableProps {
  reports: Report[]
  isLoading?: boolean
}

export function ReportTable({ reports, isLoading }: ReportTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-muted-foreground">No reports found</p>
        <Link href="/new-report">
          <Button size="sm" variant="outline">Create your first report</Button>
        </Link>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>Incident Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Paramedic</TableHead>
          <TableHead>Time</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report, i) => (
          <motion.tr
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="border-b border-border transition-colors hover:bg-muted/30"
          >
            <TableCell>
              <div className="flex items-center gap-2">
                {report.ai_alert && (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                )}
                <div>
                  <p className="font-medium text-foreground">
                    {report.patient_name ?? 'Unknown'}
                  </p>
                  {report.patient_age && (
                    <p className="text-xs text-muted-foreground">
                      {report.patient_age}y {report.patient_gender ?? ''}
                    </p>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', getIncidentTypeColor(report.incident_type))}>
                {capitalize(report.incident_type ?? 'Unknown')}
              </span>
            </TableCell>
            <TableCell>
              <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', getStatusColor(report.status))}>
                {capitalize(report.status)}
              </span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {report.paramedic_name ?? '—'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatTimeAgo(report.created_at)}
            </TableCell>
            <TableCell className="text-right">
              <Link href={`/reports/${report.id}`}>
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Button>
              </Link>
            </TableCell>
          </motion.tr>
        ))}
      </TableBody>
    </Table>
  )
}
