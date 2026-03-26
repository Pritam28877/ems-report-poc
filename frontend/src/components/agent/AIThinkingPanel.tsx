'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Wrench, CheckCircle2, Zap, AlertCircle, Loader2, Brain } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatConfidence } from '@/lib/utils'
import type { AIThinkingEntry } from '@/lib/types'

interface AIThinkingPanelProps {
  entries: AIThinkingEntry[]
  isStreaming: boolean
}

function EntryIcon({ type }: { type: string }) {
  switch (type) {
    case 'thinking':
      return <Brain className="h-3.5 w-3.5 text-cyan-400" />
    case 'tool_call':
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400" />
    case 'tool_result':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
    case 'field_filled':
      return <Zap className="h-3.5 w-3.5 text-primary" />
    case 'alert':
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />
    case 'form_ready':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
    default:
      return <Bot className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

function EntryContent({ entry }: { entry: AIThinkingEntry }) {
  const d = entry.data as Record<string, unknown>

  switch (entry.type) {
    case 'thinking':
      return (
        <span className="text-cyan-300/80">{String(d.message ?? '')}</span>
      )
    case 'tool_call':
      return (
        <span>
          <span className="text-yellow-400">Running:</span>{' '}
          <span className="font-semibold text-foreground">{String(d.tool ?? '')}</span>
        </span>
      )
    case 'tool_result':
      return (
        <span>
          <span className="text-green-400">Done:</span>{' '}
          <span className="text-foreground">{String(d.tool ?? '')}</span>
        </span>
      )
    case 'field_filled':
      return (
        <span>
          <span className="text-primary">{String(d.field ?? '')}</span>
          <span className="text-muted-foreground"> ← </span>
          <span className="text-foreground font-medium">
            {typeof d.value === 'boolean'
              ? d.value
                ? 'Yes'
                : 'No'
              : Array.isArray(d.value)
              ? (d.value as string[]).join(', ')
              : String(d.value ?? '')}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            ({formatConfidence(Number(d.confidence ?? 0))})
          </span>
        </span>
      )
    case 'alert':
      return (
        <span>
          <span className="text-destructive font-semibold uppercase">[{String(d.type ?? 'ALERT')}]</span>
          <span className="text-muted-foreground"> — </span>
          <span className="text-foreground">{String(d.message ?? '')}</span>
        </span>
      )
    case 'form_ready':
      return (
        <span className="text-green-400 font-medium">
          Form ready — {String(d.incident_type ?? '')} template loaded
        </span>
      )
    case 'done':
      return <span className="text-green-400">Analysis complete.</span>
    default:
      return <span className="text-muted-foreground">{JSON.stringify(entry.data)}</span>
  }
}

export function AIThinkingPanel({ entries, isStreaming }: AIThinkingPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-[#0a0d14] font-mono">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className={cn('h-2 w-2 rounded-full', isStreaming ? 'bg-primary animate-pulse' : 'bg-muted-foreground')} />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          AI Reasoning
        </span>
        {isStreaming && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-auto text-xs text-primary"
          >
            Analyzing...
          </motion.span>
        )}
        {!isStreaming && entries.length > 0 && (
          <span className="ml-auto text-xs text-green-400">Complete</span>
        )}
      </div>

      {/* Event stream */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {entries.length === 0 && !isStreaming && (
            <p className="text-xs text-muted-foreground">
              AI reasoning will appear here during analysis...
            </p>
          )}
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex items-start gap-2 rounded-md px-2 py-1.5 text-xs',
                  entry.type === 'alert' && 'bg-destructive/10 border border-destructive/20',
                  entry.type === 'form_ready' && 'bg-green-400/5 border border-green-400/20',
                  entry.type === 'field_filled' && 'bg-primary/5'
                )}
              >
                <span className="mt-0.5 shrink-0">
                  <EntryIcon type={entry.type} />
                </span>
                <span className="leading-relaxed">
                  <EntryContent entry={entry} />
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-2 py-1"
            >
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Processing...</span>
            </motion.div>
          )}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Stats footer */}
      {entries.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <p className="text-xs text-muted-foreground">
            {entries.filter((e) => e.type === 'field_filled').length} fields filled &middot;{' '}
            {entries.filter((e) => e.type === 'tool_call').length} tools used
          </p>
        </div>
      )}
    </div>
  )
}
