'use client'

import { motion } from 'framer-motion'
import { Mic, FileText, Bot, ClipboardCheck, AlertCircle, Circle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { TimelineEvent } from '@/lib/types'

interface ReportTimelineProps {
  events: TimelineEvent[]
}

function getEventIcon(event: string) {
  const lower = event.toLowerCase()
  if (lower.includes('record') || lower.includes('audio')) return Mic
  if (lower.includes('transcri')) return FileText
  if (lower.includes('ai') || lower.includes('analyz') || lower.includes('agent')) return Bot
  if (lower.includes('submit') || lower.includes('complet')) return ClipboardCheck
  if (lower.includes('alert')) return AlertCircle
  return Circle
}

function getEventColor(event: string) {
  const lower = event.toLowerCase()
  if (lower.includes('record') || lower.includes('audio')) return 'text-primary bg-primary/10 border-primary/30'
  if (lower.includes('transcri')) return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
  if (lower.includes('ai') || lower.includes('analyz') || lower.includes('agent')) return 'text-purple-400 bg-purple-400/10 border-purple-400/30'
  if (lower.includes('submit') || lower.includes('complet')) return 'text-green-400 bg-green-400/10 border-green-400/30'
  if (lower.includes('alert')) return 'text-destructive bg-destructive/10 border-destructive/30'
  return 'text-muted-foreground bg-muted border-border'
}

export function ReportTimeline({ events }: ReportTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No timeline events recorded
      </div>
    )
  }

  return (
    <div className="relative space-y-4">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 h-full w-px bg-border" />

      {events.map((event, i) => {
        const Icon = getEventIcon(event.event)
        const color = getEventColor(event.event)

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="relative flex items-start gap-4"
          >
            {/* Icon */}
            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${color}`}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-2 pt-1.5">
              <p className="text-sm font-medium text-foreground">{event.event}</p>
              {event.detail && (
                <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground/60">{formatDate(event.timestamp)}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
