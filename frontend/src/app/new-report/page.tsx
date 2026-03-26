'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Mic, FileText, Brain, CheckCircle2, ArrowRight, RefreshCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'
import { TranscriptDisplay } from '@/components/voice/TranscriptDisplay'
import { AIThinkingPanel } from '@/components/agent/AIThinkingPanel'
import { DynamicForm } from '@/components/forms/DynamicForm'
import { ClinicalAlertBanner } from '@/components/alerts/ClinicalAlertBanner'
import { useSSEStream } from '@/hooks/useSSEStream'
import { useCreateReport } from '@/hooks/useReports'
import { getAnalyzeStreamURL } from '@/lib/api'
import { toast } from '@/components/ui/use-toast'
import type { FormField, SSEFieldFilledData } from '@/lib/types'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3 | 4

const STEPS = [
  { step: 1 as Step, label: 'Record', icon: Mic },
  { step: 2 as Step, label: 'Transcript', icon: FileText },
  { step: 3 as Step, label: 'AI Analysis', icon: Brain },
  { step: 4 as Step, label: 'Done', icon: CheckCircle2 },
]

export default function NewReportPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [transcript, setTranscript] = useState('')
  const [transcriptionId, setTranscriptionId] = useState<number | undefined>(undefined)
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [createdReportId, setCreatedReportId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  const fillFieldRef = useRef<((data: SSEFieldFilledData) => void) | null>(null)

  const { mutateAsync: createReport } = useCreateReport()

  const { isStreaming, entries, formReady, alert, startStream, reset: resetStream } = useSSEStream(
    getAnalyzeStreamURL(),
    {
      onFieldFilled: (data) => {
        fillFieldRef.current?.(data)
      },
      onFormReady: (data) => {
        setFormFields(data.fields)
      },
      onError: (msg) => {
        toast({ title: 'Stream Error', description: msg, variant: 'destructive' })
      },
    }
  )

  // Step 1 → 2: transcript received
  const handleTranscriptReady = useCallback((text: string, tId: number) => {
    setTranscript(text)
    setTranscriptionId(tId)
    setCurrentStep(2)
  }, [])

  // Step 2 → 3: start AI analysis
  const handleAnalyze = () => {
    if (!transcript.trim()) return
    resetStream()
    setFormFields([])
    setCurrentStep(3)
    startStream(transcript, transcriptionId)
  }

  // Step 3: submit form
  const handleSubmitReport = async (
    formData: Record<string, unknown>,
    fields: Array<{ field_key: string; field_value: string | null; ai_filled: boolean; ai_confidence: number }>
  ) => {
    if (!acknowledged && alert) {
      toast({
        title: 'Acknowledge Alert',
        description: 'Please acknowledge the clinical alert before submitting.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createReport({
        transcription_id: transcriptionId,
        template_id: formReady?.template_id,
        incident_type: formReady?.incident_type,
        patient_name: String(formData.patient_name ?? ''),
        patient_age: formData.patient_age ? Number(formData.patient_age) : undefined,
        patient_gender: String(formData.patient_gender ?? '') || undefined,
        incident_time: String(formData.incident_time ?? '') || undefined,
        location: String(formData.location ?? '') || undefined,
        paramedic_name: String(formData.paramedic_name ?? '') || undefined,
        ai_alert: alert?.type,
        ai_alert_severity: alert?.severity,
        form_data: formData,
        fields,
        status: 'submitted',
      } as Parameters<typeof createReport>[0])

      setCreatedReportId(result.report_id)
      setCurrentStep(4)
    } catch (err) {
      toast({
        title: 'Submission Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetAll = () => {
    setCurrentStep(1)
    setTranscript('')
    setTranscriptionId(undefined)
    setFormFields([])
    setCreatedReportId(null)
    setIsSubmitting(false)
    setAcknowledged(false)
    resetStream()
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          New <span className="text-gradient-cyan">AI Report</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Voice-to-report in 4 steps — powered by AI
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map(({ step, label, icon: Icon }, i) => {
          const isComplete = currentStep > step
          const isActive = currentStep === step
          return (
            <div key={step} className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                isActive && 'bg-primary/20 text-primary ring-1 ring-primary/40',
                isComplete && 'bg-green-400/10 text-green-400',
                !isActive && !isComplete && 'text-muted-foreground'
              )}>
                {isComplete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                {label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'h-px w-6 transition-colors',
                  currentStep > step ? 'bg-green-400/50' : 'bg-border'
                )} />
              )}
            </div>
          )
        })}
      </div>

      <Separator />

      {/* Step content */}
      <AnimatePresence mode="wait">

        {/* STEP 1: Record */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  Record Incident Report
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Press the record button and describe the incident in detail. Include patient condition, vitals, interventions, and location.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-12">
                <VoiceRecorder onTranscriptReady={handleTranscriptReady} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 2: Review Transcript */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Review Transcript
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review and edit the transcript before AI analysis. Accuracy here improves report quality.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <TranscriptDisplay
                  transcript={transcript}
                  onChange={setTranscript}
                  editable
                />
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(1)}
                    className="gap-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Re-record
                  </Button>
                  <Button
                    onClick={handleAnalyze}
                    disabled={!transcript.trim()}
                    className="gap-2"
                    size="lg"
                  >
                    <Brain className="h-4 w-4" />
                    Analyze with AI
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 3: AI Analysis + Form */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Status bar */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-2.5">
              <div className={cn(
                'h-2 w-2 rounded-full',
                isStreaming ? 'bg-primary animate-pulse' : formReady ? 'bg-green-400' : 'bg-muted-foreground'
              )} />
              <span className="text-sm font-medium text-foreground">
                {isStreaming
                  ? 'AI is analyzing your transcript...'
                  : formReady
                  ? `Form ready — ${formReady.incident_type} template`
                  : 'Waiting for analysis...'}
              </span>
              {formFields.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {formFields.length} fields
                </span>
              )}
            </div>

            {/* Clinical alert */}
            {alert && (
              <ClinicalAlertBanner
                alert={alert}
                requiresAcknowledgment
                onAcknowledge={() => setAcknowledged(true)}
              />
            )}

            {/* Main content: Form + AI Panel */}
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Form */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      {formReady ? `${formReady.incident_type.toUpperCase()} Report` : 'Report Form'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {formFields.length > 0 ? (
                      <DynamicForm
                        fields={formFields}
                        onSubmit={handleSubmitReport}
                        isSubmitting={isSubmitting}
                        fillFieldRef={fillFieldRef}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-12 text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
                        <p className="text-sm text-muted-foreground">
                          Waiting for AI to determine form template...
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* AI Thinking Panel */}
              <div className="lg:col-span-2">
                <div className="sticky top-6 h-[600px]">
                  <AIThinkingPanel entries={entries} isStreaming={isStreaming} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Success */}
        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, type: 'spring' }}
          >
            <Card>
              <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-green-400/10 ring-4 ring-green-400/20"
                >
                  <CheckCircle2 className="h-10 w-10 text-green-400" />
                </motion.div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">Report Submitted!</h3>
                  <p className="text-muted-foreground">
                    Your report has been successfully created and submitted.
                  </p>
                  {createdReportId && (
                    <div className="mt-3 rounded-lg bg-muted/50 px-6 py-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Report ID</p>
                      <p className="text-3xl font-mono font-bold text-primary">#{createdReportId}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {createdReportId && (
                    <Link href={`/reports/${createdReportId}`}>
                      <Button variant="outline" className="gap-2">
                        <FileText className="h-4 w-4" />
                        View Report
                      </Button>
                    </Link>
                  )}
                  <Button onClick={resetAll} className="gap-2">
                    <Mic className="h-4 w-4" />
                    New Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
