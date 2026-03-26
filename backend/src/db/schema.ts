import { getDb } from './client';

const TRAUMA_FIELDS = [
  { key: 'patient_name', label: 'Patient Name', type: 'text', required: true },
  { key: 'patient_age', label: 'Age', type: 'number', required: true },
  {
    key: 'patient_gender',
    label: 'Gender',
    type: 'select',
    options: ['Male', 'Female', 'Other'],
    required: true,
  },
  { key: 'incident_time', label: 'Incident Time', type: 'datetime', required: true },
  { key: 'location', label: 'Location', type: 'text', required: true },
  {
    key: 'mechanism_of_injury',
    label: 'Mechanism of Injury',
    type: 'select',
    options: ['MVA', 'Fall', 'Penetrating Trauma', 'Blunt Force', 'Burns', 'Other'],
    required: true,
  },
  { key: 'gcs_score', label: 'GCS Score', type: 'number', min: 3, max: 15, required: true },
  { key: 'bp_systolic', label: 'BP Systolic', type: 'number', required: true },
  { key: 'bp_diastolic', label: 'BP Diastolic', type: 'number', required: true },
  { key: 'heart_rate', label: 'Heart Rate (bpm)', type: 'number', required: true },
  { key: 'spo2', label: 'SpO2 (%)', type: 'number', min: 0, max: 100, required: true },
  { key: 'respiratory_rate', label: 'Respiratory Rate', type: 'number', required: true },
  { key: 'injuries_description', label: 'Injuries Description', type: 'textarea', required: true },
  {
    key: 'interventions',
    label: 'Interventions',
    type: 'multiselect',
    options: [
      'IV Access',
      'Oxygen',
      'Splinting',
      'Wound Dressing',
      'Tourniquet',
      'C-Collar',
      'Backboard',
      'Airway Management',
    ],
  },
  { key: 'medications_given', label: 'Medications Given', type: 'textarea' },
  { key: 'blood_loss_estimate', label: 'Est. Blood Loss (mL)', type: 'number' },
  { key: 'hospital_destination', label: 'Hospital Destination', type: 'text', required: true },
  { key: 'paramedic_name', label: 'Paramedic Name', type: 'text', required: true },
  { key: 'partner_name', label: 'Partner Name', type: 'text' },
  { key: 'narrative', label: 'Clinical Narrative', type: 'textarea', required: true },
];

const CARDIAC_FIELDS = [
  { key: 'patient_name', label: 'Patient Name', type: 'text', required: true },
  { key: 'patient_age', label: 'Age', type: 'number', required: true },
  {
    key: 'patient_gender',
    label: 'Gender',
    type: 'select',
    options: ['Male', 'Female', 'Other'],
    required: true,
  },
  { key: 'incident_time', label: 'Incident Time', type: 'datetime', required: true },
  { key: 'location', label: 'Location', type: 'text', required: true },
  { key: 'chief_complaint', label: 'Chief Complaint', type: 'text', required: true },
  { key: 'onset_time', label: 'Symptom Onset Time', type: 'text' },
  { key: 'cardiac_history', label: 'Cardiac History', type: 'textarea' },
  { key: 'current_medications', label: 'Current Medications', type: 'textarea' },
  { key: 'bp_systolic', label: 'BP Systolic', type: 'number', required: true },
  { key: 'bp_diastolic', label: 'BP Diastolic', type: 'number', required: true },
  { key: 'heart_rate', label: 'Heart Rate (bpm)', type: 'number', required: true },
  { key: 'spo2', label: 'SpO2 (%)', type: 'number', min: 0, max: 100, required: true },
  {
    key: 'ecg_rhythm',
    label: 'ECG Rhythm',
    type: 'select',
    options: [
      'NSR',
      'A-Fib',
      'A-Flutter',
      'SVT',
      'VT',
      'VF',
      'STEMI',
      'NSTEMI',
      'Heart Block',
      'PEA',
      'Asystole',
    ],
  },
  { key: '12_lead_done', label: '12-Lead ECG Done', type: 'checkbox' },
  { key: 'stemi_alert', label: 'STEMI Alert Activated', type: 'checkbox' },
  { key: 'defib_used', label: 'Defibrillation Used', type: 'checkbox' },
  { key: 'cpr_performed', label: 'CPR Performed', type: 'checkbox' },
  {
    key: 'interventions',
    label: 'Interventions',
    type: 'multiselect',
    options: [
      'Oxygen',
      'IV Access',
      '12-Lead ECG',
      'Nitroglycerin',
      'Aspirin',
      'Morphine',
      'Amiodarone',
      'Adenosine',
      'Atropine',
      'Epinephrine',
    ],
  },
  { key: 'medications_given', label: 'Medications Given', type: 'textarea' },
  { key: 'response_to_treatment', label: 'Response to Treatment', type: 'textarea' },
  { key: 'hospital_destination', label: 'Hospital Destination', type: 'text', required: true },
  { key: 'paramedic_name', label: 'Paramedic Name', type: 'text', required: true },
  { key: 'narrative', label: 'Clinical Narrative', type: 'textarea', required: true },
];

const RESPIRATORY_FIELDS = [
  { key: 'patient_name', label: 'Patient Name', type: 'text', required: true },
  { key: 'patient_age', label: 'Age', type: 'number', required: true },
  {
    key: 'patient_gender',
    label: 'Gender',
    type: 'select',
    options: ['Male', 'Female', 'Other'],
    required: true,
  },
  { key: 'incident_time', label: 'Incident Time', type: 'datetime', required: true },
  { key: 'location', label: 'Location', type: 'text', required: true },
  { key: 'chief_complaint', label: 'Chief Complaint', type: 'text', required: true },
  { key: 'respiratory_history', label: 'Respiratory History', type: 'textarea' },
  { key: 'respiratory_rate', label: 'Respiratory Rate', type: 'number', required: true },
  { key: 'spo2', label: 'SpO2 (%)', type: 'number', min: 0, max: 100, required: true },
  {
    key: 'breath_sounds',
    label: 'Breath Sounds',
    type: 'select',
    options: ['Clear', 'Wheezing', 'Crackles', 'Diminished', 'Absent', 'Stridor'],
    required: true,
  },
  { key: 'bp_systolic', label: 'BP Systolic', type: 'number', required: true },
  { key: 'bp_diastolic', label: 'BP Diastolic', type: 'number', required: true },
  { key: 'heart_rate', label: 'Heart Rate (bpm)', type: 'number', required: true },
  {
    key: 'oxygen_delivered',
    label: 'Oxygen Delivered',
    type: 'select',
    options: [
      'Room Air',
      'Nasal Cannula',
      'Non-Rebreather Mask',
      'BVM',
      'CPAP',
      'BiPAP',
      'Intubated',
    ],
  },
  { key: 'lpm', label: 'Flow Rate (LPM)', type: 'number' },
  { key: 'nebulizer_used', label: 'Nebulizer Used', type: 'checkbox' },
  { key: 'medication_used', label: 'Medication Used', type: 'text' },
  {
    key: 'interventions',
    label: 'Interventions',
    type: 'multiselect',
    options: ['Oxygen', 'Nebulizer', 'CPAP', 'BiPAP', 'IV Access', 'Intubation', 'Suction'],
  },
  { key: 'response_to_treatment', label: 'Response to Treatment', type: 'textarea' },
  { key: 'hospital_destination', label: 'Hospital Destination', type: 'text', required: true },
  { key: 'paramedic_name', label: 'Paramedic Name', type: 'text', required: true },
  { key: 'narrative', label: 'Clinical Narrative', type: 'textarea', required: true },
];

export function initializeSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS transcriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audio_path TEXT,
      transcript TEXT NOT NULL,
      duration_s REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS form_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      incident_type TEXT NOT NULL UNIQUE,
      schema_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transcription_id INTEGER REFERENCES transcriptions(id),
      template_id INTEGER REFERENCES form_templates(id),
      status TEXT DEFAULT 'draft',
      incident_type TEXT,
      patient_name TEXT,
      patient_age INTEGER,
      patient_gender TEXT,
      incident_time TEXT,
      location TEXT,
      paramedic_name TEXT,
      ai_alert TEXT,
      ai_alert_severity TEXT,
      form_data_json TEXT NOT NULL DEFAULT '{}',
      submitted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS report_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
      field_key TEXT NOT NULL,
      field_value TEXT,
      ai_filled INTEGER DEFAULT 0,
      ai_confidence REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS report_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      detail TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_incident_type ON reports(incident_type);
    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
    CREATE INDEX IF NOT EXISTS idx_report_fields_report_id ON report_fields(report_id);
    CREATE INDEX IF NOT EXISTS idx_report_timeline_report_id ON report_timeline(report_id);
  `);

  seedFormTemplates();
}

function seedFormTemplates(): void {
  const db = getDb();

  const templates = [
    {
      name: 'Trauma Incident Report',
      incident_type: 'trauma',
      fields: TRAUMA_FIELDS,
    },
    {
      name: 'Cardiac Incident Report',
      incident_type: 'cardiac',
      fields: CARDIAC_FIELDS,
    },
    {
      name: 'Respiratory Incident Report',
      incident_type: 'respiratory',
      fields: RESPIRATORY_FIELDS,
    },
  ];

  const upsert = db.prepare(`
    INSERT INTO form_templates (name, incident_type, schema_json)
    VALUES (@name, @incident_type, @schema_json)
    ON CONFLICT(incident_type) DO UPDATE SET
      name = excluded.name,
      schema_json = excluded.schema_json
  `);

  const upsertAll = db.transaction(() => {
    for (const tpl of templates) {
      upsert.run({
        name: tpl.name,
        incident_type: tpl.incident_type,
        schema_json: JSON.stringify(tpl.fields),
      });
    }
  });

  upsertAll();
}
