export interface AiField {
  key: string;
  value: string | number | boolean | string[] | null;
  ai_filled: true;
  ai_confidence: number;
}

export interface DetectIncidentTypeResult {
  incident_type: 'trauma' | 'cardiac' | 'respiratory' | 'unknown';
  confidence: number;
  reasoning: string;
}

export interface ExtractPatientInfoResult {
  patient_name: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  date_of_birth: string | null;
}

export interface ExtractVitalsResult {
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  gcs_score: number | null;
  temperature: number | null;
  blood_glucose: number | null;
}

export interface ExtractIncidentDetailsResult {
  incident_time: string | null;
  location: string | null;
  mechanism_of_injury: string | null;
  chief_complaint: string | null;
  onset_time: string | null;
}

export interface ExtractInterventionsResult {
  interventions: string[];
  oxygen_delivered: string | null;
  lpm: number | null;
  cpr_performed: boolean;
  defib_used: boolean;
  nebulizer_used: boolean;
  intubated: boolean;
}

export interface ExtractMedicationsResult {
  medications: Array<{
    name: string;
    dose: string | null;
    route: string | null;
    time: string | null;
  }>;
  medications_summary: string;
}

export interface ExtractNarrativeResult {
  narrative: string;
  dispatch_info: string | null;
  scene_findings: string | null;
  treatment_provided: string | null;
  patient_response: string | null;
  transport_info: string | null;
}

export interface DetectClinicalAlertResult {
  alert_detected: boolean;
  alert_type: string | null;
  severity: 'critical' | 'warning' | 'info' | null;
  message: string | null;
  indicators: string[];
}

export type AgentToolName =
  | 'detect_incident_type'
  | 'extract_patient_info'
  | 'extract_vitals'
  | 'extract_incident_details'
  | 'extract_interventions'
  | 'extract_medications'
  | 'extract_narrative'
  | 'detect_clinical_alert';

export interface AgentToolCallEvent {
  tool: AgentToolName;
  status: 'running' | 'complete' | 'error';
}

export interface AgentToolResultEvent {
  tool: AgentToolName;
  result: unknown;
}

export interface AgentFieldFilledEvent {
  field: string;
  value: string | number | boolean | string[] | null;
  confidence: number;
}

export interface AgentAlertEvent {
  type: string;
  severity: string;
  message: string;
}

export interface AgentFormReadyEvent {
  incident_type: string;
  template_id: number | null;
  fields: AiField[];
  transcription_id: number | null;
}

export interface AgentDoneEvent {
  report_id: number | null;
}

export interface AgentThinkingEvent {
  message: string;
}

export type SSEEventType =
  | 'thinking'
  | 'tool_call'
  | 'tool_result'
  | 'field_filled'
  | 'alert'
  | 'form_ready'
  | 'done'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

export interface AgentAnalyzeRequest {
  transcript: string;
  transcription_id?: number;
}
