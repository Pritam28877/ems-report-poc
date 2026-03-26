export type ReportStatus = 'draft' | 'pending_review' | 'submitted' | 'archived'
export type IncidentType = 'trauma' | 'cardiac' | 'respiratory'
export type FieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'datetime'

export interface FormField {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  min?: number
  max?: number
  value?: string | number | boolean | string[] | null
  ai_filled?: boolean
  ai_confidence?: number
}

export interface FormTemplate {
  id: number
  name: string
  incident_type: string
  fields: FormField[]
  created_at: string
}

export interface Report {
  id: number
  transcription_id: number | null
  template_id: number | null
  status: ReportStatus
  incident_type: string | null
  patient_name: string | null
  patient_age: number | null
  patient_gender: string | null
  incident_time: string | null
  location: string | null
  paramedic_name: string | null
  ai_alert: string | null
  ai_alert_severity: string | null
  form_data_json: string
  form_data?: Record<string, unknown>
  submitted_at: string | null
  created_at: string
  updated_at: string
  fields?: ReportField[]
  timeline?: TimelineEvent[]
}

export interface ReportField {
  id: number
  report_id: number
  field_key: string
  field_value: string | null
  ai_filled: number | boolean
  ai_confidence: number
  created_at?: string
}

export interface TimelineEvent {
  id: number
  report_id: number
  event: string
  detail: string | null
  timestamp: string
}

export interface PaginatedReports {
  reports: Report[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface TranscribeResponse {
  transcription_id: number
  transcript: string
  duration_s: number
}

export interface CreateReportBody {
  transcription_id?: number
  template_id?: number
  incident_type?: string
  patient_name?: string
  patient_age?: number
  patient_gender?: string
  incident_time?: string
  location?: string
  paramedic_name?: string
  ai_alert?: string
  ai_alert_severity?: string
  form_data?: Record<string, unknown>
  fields?: Array<{
    field_key: string
    field_value: string | null
    ai_filled?: boolean
    ai_confidence?: number
  }>
}

// SSE Event types
export type SSEEventType =
  | 'thinking'
  | 'tool_call'
  | 'tool_result'
  | 'field_filled'
  | 'alert'
  | 'form_ready'
  | 'done'
  | 'error'

export interface SSEThinkingData {
  message: string
}

export interface SSEToolCallData {
  tool: string
  status: 'running'
}

export interface SSEToolResultData {
  tool: string
  result: unknown
}

export interface SSEFieldFilledData {
  field: string
  value: string | number | boolean | string[] | null
  confidence: number
}

export interface SSEAlertData {
  type: string
  severity: 'critical' | 'warning'
  message: string
}

export interface SSEFormReadyData {
  incident_type: string
  template_id: number
  fields: FormField[]
  transcription_id: number
}

export interface SSEEvent {
  type: SSEEventType
  data: SSEThinkingData | SSEToolCallData | SSEToolResultData | SSEFieldFilledData | SSEAlertData | SSEFormReadyData | Record<string, unknown>
}

export interface AIThinkingEntry {
  id: string
  type: SSEEventType
  timestamp: Date
  data: SSEEvent['data']
}
