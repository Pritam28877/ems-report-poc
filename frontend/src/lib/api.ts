import type {
  PaginatedReports,
  Report,
  TranscribeResponse,
  CreateReportBody,
  FormTemplate,
} from './types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'APIError'
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let details: unknown
    try {
      details = await res.json()
    } catch {
      details = null
    }
    const message =
      typeof details === 'object' && details !== null && 'error' in details
        ? String((details as Record<string, unknown>).error)
        : `HTTP ${res.status}`
    throw new APIError(res.status, message, details)
  }
  return res.json() as Promise<T>
}

// Reports
export async function fetchReports(params?: {
  status?: string
  incident_type?: string
  search?: string
  page?: number
  per_page?: number
  date_from?: string
  date_to?: string
}): Promise<PaginatedReports> {
  const url = new URL(`${BASE_URL}/api/reports`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v))
      }
    })
  }
  const res = await fetch(url.toString(), { cache: 'no-store' })
  return handleResponse<PaginatedReports>(res)
}

export async function fetchReport(id: number): Promise<Report> {
  const res = await fetch(`${BASE_URL}/api/reports/${id}`, { cache: 'no-store' })
  return handleResponse<Report>(res)
}

export async function createReport(body: CreateReportBody): Promise<{ report_id: number }> {
  const res = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<{ report_id: number }>(res)
}

export async function updateReport(
  id: number,
  body: Partial<CreateReportBody> & { status?: string }
): Promise<{ success: boolean; report_id: number }> {
  const res = await fetch(`${BASE_URL}/api/reports/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<{ success: boolean; report_id: number }>(res)
}

// Transcribe
export async function transcribeAudio(audioBlob: Blob): Promise<TranscribeResponse> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  const res = await fetch(`${BASE_URL}/api/transcribe`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse<TranscribeResponse>(res)
}

// Templates
export async function fetchTemplates(): Promise<{ templates: FormTemplate[] }> {
  const res = await fetch(`${BASE_URL}/api/reports/templates/all`, { cache: 'no-store' })
  return handleResponse<{ templates: FormTemplate[] }>(res)
}

export async function fetchTemplateByType(incidentType: string): Promise<FormTemplate> {
  const res = await fetch(`${BASE_URL}/api/reports/templates/${incidentType}`, {
    cache: 'no-store',
  })
  return handleResponse<FormTemplate>(res)
}

// SSE stream URL builder (used by useSSEStream hook)
export function getAnalyzeStreamURL(): string {
  return `${BASE_URL}/api/agent/analyze`
}
