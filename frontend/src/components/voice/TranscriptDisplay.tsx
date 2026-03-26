'use client'

import { motion } from 'framer-motion'
import { FileText, Edit3 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface TranscriptDisplayProps {
  transcript: string
  onChange: (value: string) => void
  editable?: boolean
}

export function TranscriptDisplay({ transcript, onChange, editable = true }: TranscriptDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium text-foreground">Transcript</Label>
        {editable && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Edit3 className="h-3 w-3" />
            Editable
          </span>
        )}
      </div>
      <Textarea
        value={transcript}
        onChange={(e) => onChange(e.target.value)}
        readOnly={!editable}
        className="min-h-[160px] resize-none font-mono text-sm leading-relaxed"
        placeholder="Transcript will appear here..."
      />
      <p className="text-xs text-muted-foreground">
        {transcript.split(/\s+/).filter(Boolean).length} words &middot; Review and edit before AI analysis
      </p>
    </motion.div>
  )
}
