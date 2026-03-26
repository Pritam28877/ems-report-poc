import dotenv from 'dotenv';
import path from 'path';

// Load backend-local .env first (highest priority)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Fall back to project root .env
dotenv.config({ path: path.resolve(__dirname, '../../../..', '.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

// Backend package root = two levels up from compiled dist/config/ or src/config/
const BACKEND_ROOT = path.resolve(__dirname, '../..');

export const config = {
  port: parseInt(optionalEnv('BACKEND_PORT', '4000'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  openaiApiKey: requireEnv('OPENAI_API_KEY'),
  dbPath: optionalEnv('DB_PATH', './data/reports.db'),
  corsOrigins: optionalEnv('CORS_ORIGINS', 'http://localhost:3000').split(',').map(s => s.trim()),
  uploadsDir: path.resolve(BACKEND_ROOT, 'uploads'),
  dataDir: path.resolve(BACKEND_ROOT, 'data'),
} as const;
