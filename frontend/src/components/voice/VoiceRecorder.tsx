'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { transcribeAudio } from '@/lib/api'
import { formatDuration } from '@/lib/utils'
import { useState } from 'react'

interface VoiceRecorderProps {
  onTranscriptReady: (transcript: string, transcriptionId: number) => void
}

export function VoiceRecorder({ onTranscriptReady }: VoiceRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { isRecording, duration, audioBlob, error, analyserNode, startRecording, stopRecording } =
    useVoiceRecorder()

  // Draw waveform
  const drawWaveform = useCallback(() => {
    if (!analyserNode || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const render = () => {
      rafRef.current = requestAnimationFrame(render)
      analyserNode.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85
        const intensity = dataArray[i] / 255

        // Gradient color: cyan to teal
        const r = Math.round(6 + (0 - 6) * intensity)
        const g = Math.round(182 + (200 - 182) * intensity)
        const b = Math.round(212 + (180 - 212) * intensity)

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.6})`
        ctx.fillRect(x, (canvas.height - barHeight) / 2, barWidth - 1, barHeight)
        x += barWidth + 1
      }
    }

    render()
  }, [analyserNode])

  useEffect(() => {
    if (analyserNode && isRecording) {
      drawWaveform()
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [analyserNode, isRecording, drawWaveform])

  // Clear canvas when not recording
  useEffect(() => {
    if (!isRecording && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }, [isRecording])

  // Upload when blob ready
  useEffect(() => {
    if (!audioBlob) return
    const upload = async () => {
      setIsUploading(true)
      setUploadError(null)
      try {
        const result = await transcribeAudio(audioBlob)
        onTranscriptReady(result.transcript, result.transcription_id)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Transcription failed')
      } finally {
        setIsUploading(false)
      }
    }
    upload()
  }, [audioBlob, onTranscriptReady])

  const handleToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Waveform canvas */}
      <div className="relative h-24 w-full max-w-md overflow-hidden rounded-xl border border-border bg-card/50">
        <canvas ref={canvasRef} width={600} height={96} className="h-full w-full" />
        {!isRecording && !isUploading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              {audioBlob ? 'Recording complete' : 'Waveform will appear here'}
            </p>
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-xs text-primary">Transcribing audio...</p>
          </div>
        )}
      </div>

      {/* Timer */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="font-mono text-3xl font-bold tabular-nums text-foreground"
          >
            {formatDuration(duration)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record button */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings when recording */}
        {isRecording && (
          <>
            <span className="record-ring absolute inline-flex h-24 w-24 rounded-full bg-destructive/20" />
            <span className="record-ring-delay absolute inline-flex h-24 w-24 rounded-full bg-destructive/10" />
          </>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          disabled={isUploading}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            isRecording
              ? 'bg-destructive glow-red'
              : 'bg-primary glow-cyan hover:bg-primary/90'
          }`}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
          ) : isRecording ? (
            <Square className="h-8 w-8 fill-current text-white" />
          ) : (
            <Mic className="h-8 w-8 text-primary-foreground" />
          )}
        </motion.button>
      </div>

      {/* Status label */}
      <p className="text-sm text-muted-foreground">
        {isUploading
          ? 'Processing your recording...'
          : isRecording
          ? 'Recording... tap to stop'
          : audioBlob
          ? 'Recording complete'
          : 'Tap to start recording'}
      </p>

      {/* Errors */}
      {(error || uploadError) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          {error || uploadError}
        </motion.div>
      )}
    </div>
  )
}
