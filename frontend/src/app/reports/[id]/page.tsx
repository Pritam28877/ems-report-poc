'use client'

import { use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Printer,
  User,
  MapPin,
  Clock,
  Stethoscope,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { AIFilledBadge } from '@/components/forms/AIFilledBadge'
import { ReportTimeline } from '@/components/reports/ReportTimeline'
import { ClinicalAlertBanner } from '@/components/alerts/ClinicalAlertBanner'
import { useReport } from '@/hooks/useReports'
import {
  cn,
  capitalize,
  formatDate,
  formatTimeAgo,
  getIncidentTypeColor,
  getStatusColor,
} from '@/lib/utils'
import { useState } from 'react'
import type { SSEAlertData } from '@/lib/types'

interface PageProps {
  params: Promise<{ id: string }>
}

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>
  }
  if (typeof value === 'boolean') {
    return <span className={value ? 'text-green-400' : 'text-muted-foreground'}>{value ? 'Yes' : 'No'}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">{String(v)}</span>
        ))}
      </div>
    )
  }
  return <span>{String(value)}</span>
}

export default function ReportDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const reportId = parseInt(id, 10)
  const { data: report, isLoading, isError } = useReport(reportId)
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Report not found or failed to load</p>
        <Link href="/reports">
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>
    )
  }

  // Parse form data
  let formData: Record<string, unknown> = {}
  try {
    formData = typeof report.form_data === 'object' && report.form_data !== null
      ? report.form_data
      : JSON.parse(report.form_data_json ?? '{}')
  } catch {
    formData = {}
  }

  const fields = report.fields ?? []
  const timeline = report.timeline ?? []

  // Build alert object for banner
  const alertData: SSEAlertData | null = report.ai_alert
    ? {
        type: report.ai_alert,
        severity: (report.ai_alert_severity as 'critical' | 'warning') ?? 'warning',
        message: report.ai_alert,
      }
    : null

  // Separate patient info fields from clinical
  const patientKeys = ['patient_name', 'patient_age', 'patient_gender', 'incident_time', 'location', 'paramedic_name']
  const patientFields = fields.filter((f) => patientKeys.includes(f.field_key))
  const clinicalFields = fields.filter((f) => !patientKeys.includes(f.field_key))

  return (
    <div className="space-y-6 print-page">
      {/* Back + Actions */}
      <div className="no-print flex items-center justify-between">
        <Link href="/reports">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
      </div>

      {/* Alert banner */}
      {alertData && (
        <ClinicalAlertBanner alert={alertData} requiresAcknowledgment={false} />
      )}

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start gap-6">
              {/* Patient info */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">
                    {report.patient_name ?? 'Unknown Patient'}
                  </h2>
                  {report.patient_age && (
                    <span className="text-muted-foreground">— Age {report.patient_age}</span>
                  )}
                  {report.patient_gender && (
                    <span className="text-muted-foreground">({report.patient_gender})</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', getIncidentTypeColor(report.incident_type))}>
                    {capitalize(report.incident_type ?? 'Unknown')}
                  </span>
                  <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', getStatusColor(report.status))}>
                    {capitalize(report.status)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {report.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {report.location}
                    </span>
                  )}
                  {report.incident_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(report.incident_time)}
                    </span>
                  )}
                  {report.paramedic_name && (
                    <span className="flex items-center gap-1">
                      <Stethoscope className="h-3.5 w-3.5" />
                      {report.paramedic_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="text-right text-xs text-muted-foreground">
                <p>Report #{report.id}</p>
                <p className="mt-1">{formatTimeAgo(report.created_at)}</p>
                {report.submitted_at && (
                  <p className="mt-1 text-green-400">Submitted {formatDate(report.submitted_at)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Fields — left */}
        <div className="space-y-6 lg:col-span-2">
          {/* Patient info section */}
          {(patientFields.length > 0 || Object.keys(formData).some((k) => patientKeys.includes(k))) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-primary" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {patientFields.length > 0
                      ? patientFields.map((f) => (
                          <div key={f.id} className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {f.field_key.replace(/_/g, ' ')}
                              </p>
                              {(f.ai_filled === 1 || f.ai_filled === true) && (
                                <AIFilledBadge confidence={f.ai_confidence} />
                              )}
                            </div>
                            <FieldValue value={f.field_value} />
                          </div>
                        ))
                      : patientKeys
                          .filter((k) => formData[k] !== undefined)
                          .map((k) => (
                            <div key={k} className="space-y-1">
                              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {k.replace(/_/g, ' ')}
                              </p>
                              <FieldValue value={formData[k]} />
                            </div>
                          ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Clinical fields section */}
          {clinicalFields.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    Clinical Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {clinicalFields.map((f) => (
                      <div key={f.id} className={`space-y-1 ${String(f.field_value ?? '').length > 100 ? 'sm:col-span-2' : ''}`}>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {f.field_key.replace(/_/g, ' ')}
                          </p>
                          {(f.ai_filled === 1 || f.ai_filled === true) && (
                            <AIFilledBadge confidence={f.ai_confidence} />
                          )}
                        </div>
                        <FieldValue value={f.field_value} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Transcript (collapsible) */}
          {report.transcription_id && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader className="pb-0">
                  <button
                    onClick={() => setTranscriptOpen((p) => !p)}
                    className="flex w-full items-center justify-between py-1 text-left"
                  >
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      Original Transcript
                    </CardTitle>
                    {transcriptOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CardHeader>
                {transcriptOpen && (
                  <CardContent className="pt-3">
                    <div className="rounded-lg bg-muted/30 p-4 font-mono text-sm leading-relaxed text-muted-foreground">
                      Transcription #{report.transcription_id}
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          )}
        </div>

        {/* Timeline — right */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReportTimeline events={timeline} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
