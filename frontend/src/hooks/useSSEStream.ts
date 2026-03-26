'use client'

import { useCallback, useRef, useState } from 'react'
import type {
  SSEEvent,
  SSEFormReadyData,
  SSEAlertData,
  SSEFieldFilledData,
  AIThinkingEntry,
} from '@/lib/types'

interface UseSSEStreamOptions {
  onFieldFilled?: (data: SSEFieldFilledData) => void
  onFormReady?: (data: SSEFormReadyData) => void
  onAlert?: (data: SSEAlertData) => void
  onDone?: () => void
  onError?: (message: string) => void
}

interface UseSSEStreamReturn {
  isStreaming: boolean
  entries: AIThinkingEntry[]
  formReady: SSEFormReadyData | null
  alert: SSEAlertData | null
  startStream: (transcript: string, transcription_id?: number) => void
  reset: () => void
}

function parseSSELine(line: string): { event: string; data: string } | null {
  // SSE format: lines starting with "event:" or "data:"
  return null // handled in block parser
}

export function useSSEStream(
  url: string,
  options: UseSSEStreamOptions = {}
): UseSSEStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [entries, setEntries] = useState<AIThinkingEntry[]>([])
  const [formReady, setFormReady] = useState<SSEFormReadyData | null>(null)
  const [alert, setAlert] = useState<SSEAlertData | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const addEntry = useCallback((type: SSEEvent['type'], data: SSEEvent['data']) => {
    setEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        type,
        timestamp: new Date(),
        data,
      },
    ])
  }, [])

  const startStream = useCallback(
    async (transcript: string, transcription_id?: number) => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsStreaming(true)
      setEntries([])
      setFormReady(null)
      setAlert(null)

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, transcription_id }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error(`Stream failed: ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const blocks = buffer.split('\n\n')
          buffer = blocks.pop() ?? ''

          for (const block of blocks) {
            if (!block.trim()) continue
            let eventType = 'message'
            let dataStr = ''

            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim()
              } else if (line.startsWith('data:')) {
                dataStr = line.slice(5).trim()
              }
            }

            if (!dataStr) continue

            let parsed: Record<string, unknown> = {}
            try {
              parsed = JSON.parse(dataStr)
            } catch {
              continue
            }

            const type = eventType as SSEEvent['type']
            addEntry(type, parsed)

            switch (type) {
              case 'field_filled':
                options.onFieldFilled?.(parsed as unknown as SSEFieldFilledData)
                break
              case 'form_ready': {
                const fd = parsed as unknown as SSEFormReadyData
                setFormReady(fd)
                options.onFormReady?.(fd)
                break
              }
              case 'alert': {
                const ad = parsed as unknown as SSEAlertData
                setAlert(ad)
                options.onAlert?.(ad)
                break
              }
              case 'done':
                options.onDone?.()
                break
              case 'error':
                options.onError?.(String((parsed as { message?: string }).message ?? 'Stream error'))
                break
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : 'Stream connection failed'
        options.onError?.(msg)
      } finally {
        setIsStreaming(false)
      }
    },
    [url, addEntry, options]
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
    setEntries([])
    setFormReady(null)
    setAlert(null)
  }, [])

  return { isStreaming, entries, formReady, alert, startStream, reset }
}
