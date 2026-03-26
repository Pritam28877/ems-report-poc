export type ReportStatus = 'draft' | 'pending_review' | 'submitted' | 'archived';

export type IncidentType = 'trauma' | 'cardiac' | 'respiratory';

export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'datetime'
  | 'checkbox';

export interface FormFieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface FormTemplate {
  id: number;
  name: string;
  incident_type: string;
  schema_json: string;
  created_at: string;
}

export interface FormTemplateWithFields extends Omit<FormTemplate, 'schema_json'> {
  fields: FormFieldDefinition[];
}

export interface Transcription {
  id: number;
  audio_path: string | null;
  transcript: string;
  duration_s: number | null;
  created_at: string;
}

export interface Report {
  id: number;
  transcription_id: number | null;
  template_id: number | null;
  status: ReportStatus;
  incident_type: string | null;
  patient_name: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  incident_time: string | null;
  location: string | null;
  paramedic_name: string | null;
  ai_alert: string | null;
  ai_alert_severity: string | null;
  form_data_json: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportField {
  id: number;
  report_id: number;
  field_key: string;
  field_value: string | null;
  ai_filled: number;
  ai_confidence: number;
  created_at: string;
}

export interface ReportTimeline {
  id: number;
  report_id: number;
  event: string;
  detail: string | null;
  timestamp: string;
}

export interface ReportWithDetails extends Report {
  fields: ReportField[];
  timeline: ReportTimeline[];
}

export interface PaginatedReports {
  reports: Report[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CreateReportBody {
  transcription_id?: number;
  template_id?: number;
  incident_type?: string;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: string;
  incident_time?: string;
  location?: string;
  paramedic_name?: string;
  ai_alert?: string;
  ai_alert_severity?: string;
  form_data?: Record<string, unknown>;
  fields?: Array<{
    field_key: string;
    field_value: string | null;
    ai_filled?: boolean;
    ai_confidence?: number;
  }>;
}

export interface UpdateReportBody {
  status?: ReportStatus;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: string;
  incident_time?: string;
  location?: string;
  paramedic_name?: string;
  ai_alert?: string;
  ai_alert_severity?: string;
  form_data?: Record<string, unknown>;
  fields?: Array<{
    field_key: string;
    field_value: string | null;
    ai_filled?: boolean;
    ai_confidence?: number;
  }>;
}
