import { getDb } from '../db/client';
import type {
  Report,
  ReportWithDetails,
  PaginatedReports,
  CreateReportBody,
  UpdateReportBody,
} from '../types/report.types';

export function getReports(params: {
  status?: string;
  incident_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
}): PaginatedReports {
  const db = getDb();
  const { status, incident_type, date_from, date_to, search } = params;
  const page = Math.max(1, params.page ?? 1);
  const per_page = Math.min(100, Math.max(1, params.per_page ?? 20));
  const offset = (page - 1) * per_page;

  const conditions: string[] = ["status != 'archived'"];
  const values: unknown[] = [];

  if (status) {
    conditions.push('status = ?');
    values.push(status);
  }
  if (incident_type) {
    conditions.push('incident_type = ?');
    values.push(incident_type);
  }
  if (date_from) {
    conditions.push('created_at >= ?');
    values.push(date_from);
  }
  if (date_to) {
    conditions.push('created_at <= ?');
    values.push(date_to + ' 23:59:59');
  }
  if (search) {
    conditions.push(
      '(patient_name LIKE ? OR location LIKE ? OR paramedic_name LIKE ? OR incident_type LIKE ?)'
    );
    const like = `%${search}%`;
    values.push(like, like, like, like);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM reports ${where}`).get(...values) as {
      count: number;
    }
  ).count;

  const reports = db
    .prepare(
      `SELECT * FROM reports ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...values, per_page, offset) as Report[];

  return {
    reports,
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
  };
}

export function getReportById(id: number): ReportWithDetails | null {
  const db = getDb();

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as Report | undefined;
  if (!report) return null;

  const fields = db
    .prepare('SELECT * FROM report_fields WHERE report_id = ? ORDER BY id ASC')
    .all(id) as ReportWithDetails['fields'];

  const timeline = db
    .prepare('SELECT * FROM report_timeline WHERE report_id = ? ORDER BY timestamp ASC')
    .all(id) as ReportWithDetails['timeline'];

  return { ...report, fields, timeline };
}

export function createReport(body: CreateReportBody): number {
  const db = getDb();

  const formDataJson = body.form_data ? JSON.stringify(body.form_data) : '{}';

  const result = db
    .prepare(
      `INSERT INTO reports (
        transcription_id, template_id, status, incident_type,
        patient_name, patient_age, patient_gender, incident_time,
        location, paramedic_name, ai_alert, ai_alert_severity,
        form_data_json, updated_at
      ) VALUES (
        @transcription_id, @template_id, @status, @incident_type,
        @patient_name, @patient_age, @patient_gender, @incident_time,
        @location, @paramedic_name, @ai_alert, @ai_alert_severity,
        @form_data_json, datetime('now')
      )`
    )
    .run({
      transcription_id: body.transcription_id ?? null,
      template_id: body.template_id ?? null,
      status: 'draft',
      incident_type: body.incident_type ?? null,
      patient_name: body.patient_name ?? null,
      patient_age: body.patient_age ?? null,
      patient_gender: body.patient_gender ?? null,
      incident_time: body.incident_time ?? null,
      location: body.location ?? null,
      paramedic_name: body.paramedic_name ?? null,
      ai_alert: body.ai_alert ?? null,
      ai_alert_severity: body.ai_alert_severity ?? null,
      form_data_json: formDataJson,
    });

  const reportId = result.lastInsertRowid as number;

  // Insert fields if provided
  if (body.fields && body.fields.length > 0) {
    insertReportFields(reportId, body.fields);
  }

  // Add creation timeline event
  addTimelineEvent(reportId, 'report_created', 'Report draft created');

  return reportId;
}

export function updateReport(id: number, body: UpdateReportBody): boolean {
  const db = getDb();

  const existing = db.prepare('SELECT id, status FROM reports WHERE id = ?').get(id) as
    | { id: number; status: string }
    | undefined;
  if (!existing) return false;

  const setClauses: string[] = ['updated_at = datetime(\'now\')'];
  const values: Record<string, unknown> = { id };

  if (body.status !== undefined) {
    setClauses.push('status = @status');
    values.status = body.status;
    if (body.status === 'submitted') {
      setClauses.push("submitted_at = datetime('now')");
    }
  }
  if (body.patient_name !== undefined) {
    setClauses.push('patient_name = @patient_name');
    values.patient_name = body.patient_name;
  }
  if (body.patient_age !== undefined) {
    setClauses.push('patient_age = @patient_age');
    values.patient_age = body.patient_age;
  }
  if (body.patient_gender !== undefined) {
    setClauses.push('patient_gender = @patient_gender');
    values.patient_gender = body.patient_gender;
  }
  if (body.incident_time !== undefined) {
    setClauses.push('incident_time = @incident_time');
    values.incident_time = body.incident_time;
  }
  if (body.location !== undefined) {
    setClauses.push('location = @location');
    values.location = body.location;
  }
  if (body.paramedic_name !== undefined) {
    setClauses.push('paramedic_name = @paramedic_name');
    values.paramedic_name = body.paramedic_name;
  }
  if (body.ai_alert !== undefined) {
    setClauses.push('ai_alert = @ai_alert');
    values.ai_alert = body.ai_alert;
  }
  if (body.ai_alert_severity !== undefined) {
    setClauses.push('ai_alert_severity = @ai_alert_severity');
    values.ai_alert_severity = body.ai_alert_severity;
  }
  if (body.form_data !== undefined) {
    setClauses.push('form_data_json = @form_data_json');
    values.form_data_json = JSON.stringify(body.form_data);
  }

  db.prepare(`UPDATE reports SET ${setClauses.join(', ')} WHERE id = @id`).run(values);

  // Upsert fields if provided
  if (body.fields && body.fields.length > 0) {
    upsertReportFields(id, body.fields);
  }

  // Timeline entry for status change
  if (body.status && body.status !== existing.status) {
    addTimelineEvent(id, 'status_changed', `Status changed to ${body.status}`);
  }

  return true;
}

export function archiveReport(id: number): boolean {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM reports WHERE id = ?').get(id);
  if (!existing) return false;

  db.prepare(
    "UPDATE reports SET status = 'archived', updated_at = datetime('now') WHERE id = ?"
  ).run(id);

  addTimelineEvent(id, 'report_archived', 'Report archived');
  return true;
}

export function insertReportFields(
  reportId: number,
  fields: Array<{
    field_key: string;
    field_value: string | null;
    ai_filled?: boolean;
    ai_confidence?: number;
  }>
): void {
  const db = getDb();

  const insert = db.prepare(
    `INSERT INTO report_fields (report_id, field_key, field_value, ai_filled, ai_confidence)
     VALUES (@report_id, @field_key, @field_value, @ai_filled, @ai_confidence)`
  );

  const insertAll = db.transaction(() => {
    for (const field of fields) {
      insert.run({
        report_id: reportId,
        field_key: field.field_key,
        field_value: field.field_value,
        ai_filled: field.ai_filled ? 1 : 0,
        ai_confidence: field.ai_confidence ?? 0,
      });
    }
  });

  insertAll();
}

export function upsertReportFields(
  reportId: number,
  fields: Array<{
    field_key: string;
    field_value: string | null;
    ai_filled?: boolean;
    ai_confidence?: number;
  }>
): void {
  const db = getDb();

  const upsert = db.prepare(
    `INSERT INTO report_fields (report_id, field_key, field_value, ai_filled, ai_confidence)
     VALUES (@report_id, @field_key, @field_value, @ai_filled, @ai_confidence)
     ON CONFLICT(report_id, field_key) DO UPDATE SET
       field_value = excluded.field_value,
       ai_filled = excluded.ai_filled,
       ai_confidence = excluded.ai_confidence`
  );

  // Add unique index if not exists
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_report_fields_unique ON report_fields(report_id, field_key)`
  );

  const upsertAll = db.transaction(() => {
    for (const field of fields) {
      upsert.run({
        report_id: reportId,
        field_key: field.field_key,
        field_value: field.field_value,
        ai_filled: field.ai_filled ? 1 : 0,
        ai_confidence: field.ai_confidence ?? 0,
      });
    }
  });

  upsertAll();
}

export function addTimelineEvent(reportId: number, event: string, detail?: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO report_timeline (report_id, event, detail) VALUES (?, ?, ?)`
  ).run(reportId, event, detail ?? null);
}

export function getAllTemplates() {
  const db = getDb();
  return db.prepare('SELECT * FROM form_templates ORDER BY id ASC').all();
}

export function getTemplateByIncidentType(incidentType: string) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM form_templates WHERE incident_type = ?')
    .get(incidentType);
}
