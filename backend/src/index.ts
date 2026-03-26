import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';

import { config } from './config/env';
import { initializeSchema } from './db/schema';
import { closeDb } from './db/client';

import transcribeRouter from './routes/transcribe.route';
import agentRouter from './routes/agent.route';
import reportsRouter from './routes/reports.route';

// ─── Ensure critical directories exist ────────────────────────────────────────

if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

// ─── Initialize DB schema and seed data ───────────────────────────────────────

initializeSchema();
console.log('[db] Schema initialized, form templates seeded');

// ─── Express App ───────────────────────────────────────────────────────────────

const app = express();

// Security & logging
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Disable for API server
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, mobile apps)
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  })
);

app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/transcribe', transcribeRouter);
app.use('/api/agent', agentRouter);
app.use('/api/reports', reportsRouter);

// Form template routes (also accessible under /api/forms/templates)
app.get('/api/forms/templates', (_req: Request, res: Response, next: NextFunction) => {
  // Delegate to reports router logic
  import('./services/report.service')
    .then(({ getAllTemplates }) => {
      const templates = getAllTemplates() as Array<{
        id: number;
        name: string;
        incident_type: string;
        schema_json: string;
        created_at: string;
      }>;
      const parsed = templates.map((t) => ({
        ...t,
        fields: JSON.parse(t.schema_json),
      }));
      res.status(200).json({ templates: parsed });
    })
    .catch(next);
});

app.get('/api/forms/templates/:incident_type', (req: Request, res: Response, next: NextFunction) => {
  import('./services/report.service')
    .then(({ getTemplateByIncidentType }) => {
      const template = getTemplateByIncidentType(req.params.incident_type) as
        | { id: number; name: string; incident_type: string; schema_json: string; created_at: string }
        | undefined
        | null;

      if (!template) {
        res.status(404).json({
          error: `No template found for incident type: ${req.params.incident_type}`,
          available: ['trauma', 'cardiac', 'respiratory'],
        });
        return;
      }

      res.status(200).json({
        ...template,
        fields: JSON.parse(template.schema_json),
      });
    })
    .catch(next);
});

// ─── Health Check ──────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'ambulance-report-backend',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ─── 404 Handler ───────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message);
  if (config.nodeEnv === 'development') {
    console.error(err.stack);
  }

  // Multer errors
  if (err.message.includes('Unsupported audio format') || err.message.includes('File too large')) {
    res.status(400).json({ error: err.message });
    return;
  }

  // CORS errors
  if (err.message.startsWith('CORS:')) {
    res.status(403).json({ error: err.message });
    return;
  }

  res.status(500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────────

const server = app.listen(config.port, () => {
  console.log(`[server] Ambulance Report Backend running on port ${config.port}`);
  console.log(`[server] Environment: ${config.nodeEnv}`);
  console.log(`[server] CORS allowed origins: ${config.corsOrigins.join(', ')}`);
  console.log(`[server] DB path: ${config.dbPath}`);
});

// ─── Graceful Shutdown ─────────────────────────────────────────────────────────

function shutdown(signal: string): void {
  console.log(`\n[server] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    closeDb();
    console.log('[server] Server closed, DB connection closed.');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('[server] Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
