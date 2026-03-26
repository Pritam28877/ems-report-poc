import fs from 'fs';
import path from 'path';
import https from 'https';
import OpenAI, { toFile } from 'openai';
import type { TranscriptionVerbose } from 'openai/resources/audio/transcriptions';
import { config } from '../config/env';
import { getDb } from '../db/client';

// Force HTTP/1.1 — prevents ECONNRESET on Windows caused by HTTP/2 + SSL inspection
const agent = new https.Agent({ keepAlive: false });

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
  timeout: 120_000,
  maxRetries: 2,
  httpAgent: agent,
});

export interface TranscriptionResult {
  transcription_id: number;
  transcript: string;
  duration_s: number | null;
  audio_path: string;
}

export async function transcribeAudio(filePath: string): Promise<TranscriptionResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found at path: ${filePath}`);
  }

  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = fileName.endsWith('.mp4') ? 'audio/mp4' : 'audio/webm';

  const response = await openai.audio.transcriptions.create({
    file: await toFile(fileBuffer, fileName, { type: mimeType }),
    model: 'whisper-1',
    response_format: 'verbose_json',
    language: 'en',
  }) as TranscriptionVerbose;

  const transcript = response.text;
  const duration_s = response.duration ?? null;

  // Persist transcription to DB
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO transcriptions (audio_path, transcript, duration_s)
       VALUES (?, ?, ?)`
    )
    .run(filePath, transcript, duration_s);

  const transcription_id = result.lastInsertRowid as number;

  return {
    transcription_id,
    transcript,
    duration_s,
    audio_path: filePath,
  };
}

export function getTranscription(id: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM transcriptions WHERE id = ?').get(id);
}
