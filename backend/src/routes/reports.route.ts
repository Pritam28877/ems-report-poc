import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getReports,
  getReportById,
  createReport,
  updateReport,
  archiveReport,
  getAllTemplates,
  getTemplateByIncidentType,
} from '../services/report.service';
import type { FormTemplate } from '../types/report.types';

const router = Router();

// ─── Validation Schemas ────────────────────────────────────────────────────────

const ReportQuerySchema = z.object({
  status: z.string().optional(),
  incident_type: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

const CreateReportSchema = z.object({
  transcription_id: z.number().int().positive().optional(),
  template_id: z.number().int().positive().optional(),
  incident_type: z.string().optional(),
  patient_name: z.string().optional(),
  patient_age: z.number().int().min(0).max(150).optional(),
  patient_gender: z.enum(['Male', 'Female', 'Other']).optional(),
  incident_time: z.string().optional(),
  location: z.string().optional(),
  paramedic_name: z.string().optional(),
  ai_alert: z.string().optional(),
  ai_alert_severity: z.string().optional(),
  form_data: z.record(z.unknown()).optional(),
  fields: z
    .array(
      z.object({
        field_key: z.string(),
        field_value: z.string().nullable(),
        ai_filled: z.boolean().optional(),
        ai_confidence: z.number().min(0).max(1).optional(),
      })
    )
    .optional(),
});

const UpdateReportSchema = z.object({
  status: z.enum(['draft', 'pending_review', 'submitted', 'archived']).optional(),
  patient_name: z.string().optional(),
  patient_age: z.number().int().min(0).max(150).optional(),
  patient_gender: z.enum(['Male', 'Female', 'Other']).optional(),
  incident_time: z.string().optional(),
  location: z.string().optional(),
  paramedic_name: z.string().optional(),
  ai_alert: z.string().optional(),
  ai_alert_severity: z.string().optional(),
  form_data: z.record(z.unknown()).optional(),
  fields: z
    .array(
      z.object({
        field_key: z.string(),
        field_value: z.string().nullable(),
        ai_filled: z.boolean().optional(),
        ai_confidence: z.number().min(0).max(1).optional(),
      })
    )
    .optional(),
});

// ─── Report Routes ─────────────────────────────────────────────────────────────

/**
 * GET /api/reports
 * Query: status, incident_type, date_from, date_to, search, page, per_page
 */
router.get('/', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const queryResult = ReportQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.flatten().fieldErrors,
      });
      return;
    }

    const result = getReports(queryResult.data);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/:id
 * Returns full report with fields and timeline
 */
router.get('/:id', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    const report = getReportById(id);
    if (!report) {
      res.status(404).json({ error: `Report with ID ${id} not found` });
      return;
    }

    // Parse form_data_json for convenience
    let formData: unknown = {};
    try {
      formData = JSON.parse(report.form_data_json);
    } catch {
      formData = {};
    }

    res.status(200).json({ ...report, form_data: formData });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reports
 * Full form submission
 */
router.post('/', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const parseResult = CreateReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const reportId = createReport(parseResult.data);
    res.status(201).json({ report_id: reportId });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/reports/:id
 * Partial update
 */
router.patch('/:id', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    const parseResult = UpdateReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const updated = updateReport(id, parseResult.data);
    if (!updated) {
      res.status(404).json({ error: `Report with ID ${id} not found` });
      return;
    }

    res.status(200).json({ success: true, report_id: id });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/reports/:id
 * Soft delete — sets status to 'archived'
 */
router.delete('/:id', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    const archived = archiveReport(id);
    if (!archived) {
      res.status(404).json({ error: `Report with ID ${id} not found` });
      return;
    }

    res.status(200).json({ success: true, message: 'Report archived successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── Form Template Routes ──────────────────────────────────────────────────────

/**
 * GET /api/forms/templates
 * Returns all form templates
 */
router.get('/templates/all', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const templates = getAllTemplates() as FormTemplate[];
    const parsed = templates.map((t) => ({
      ...t,
      fields: JSON.parse(t.schema_json),
    }));
    res.status(200).json({ templates: parsed });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/forms/templates/:incident_type
 * Returns specific template schema
 */
router.get('/templates/:incident_type', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { incident_type } = req.params;
    const template = getTemplateByIncidentType(incident_type) as FormTemplate | undefined | null;

    if (!template) {
      res.status(404).json({
        error: `No template found for incident type: ${incident_type}`,
        available: ['trauma', 'cardiac', 'respiratory'],
      });
      return;
    }

    res.status(200).json({
      ...template,
      fields: JSON.parse(template.schema_json),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
