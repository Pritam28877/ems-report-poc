import { Zap } from 'lucide-react'
import { formatConfidence } from '@/lib/utils'

interface AIFilledBadgeProps {
  confidence?: number
}

export function AIFilledBadge({ confidence }: AIFilledBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
      <Zap className="h-3 w-3" />
      AI
      {confidence !== undefined && (
        <span className="text-primary/70">{formatConfidence(confidence)}</span>
      )}
    </span>
  )
}
