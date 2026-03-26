import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function getIncidentTypeColor(type: string | null | undefined): string {
  switch (type?.toLowerCase()) {
    case 'trauma':
      return 'text-red-400 bg-red-400/10 border-red-400/20'
    case 'cardiac':
      return 'text-pink-400 bg-pink-400/10 border-pink-400/20'
    case 'respiratory':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    default:
      return 'text-muted-foreground bg-muted border-border'
  }
}

export function getStatusColor(status: string | null | undefined): string {
  switch (status) {
    case 'draft':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    case 'submitted':
      return 'text-green-400 bg-green-400/10 border-green-400/20'
    case 'archived':
      return 'text-muted-foreground bg-muted border-border'
    case 'pending_review':
      return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
    default:
      return 'text-muted-foreground bg-muted border-border'
  }
}
