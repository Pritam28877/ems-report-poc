import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import { transcribeAudio } from '../services/whisper.service';

const router = Router();

// Ensure uploads directory exists
if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `audio_${uuidv4()}${ext}`);
  },
});

const ALLOWED_MIMETYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/wav',
  'audio/mpeg',
  'audio/ogg',
  'audio/x-wav',
  'audio/wave',
  'audio/mp3',
  'video/webm', // Some browsers send webm audio as video/webm
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}. Allowed: webm, mp4, wav, mpeg, ogg`));
    }
  },
});

/**
 * POST /api/transcribe
 * Accepts multipart/form-data with field `audio`
 * Sends to Whisper API, saves to DB, deletes temp file
 */
router.post(
  '/',
  upload.single('audio'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided. Use field name: audio' });
      return;
    }

    const filePath = req.file.path;

    try {
      const result = await transcribeAudio(filePath);

      res.status(200).json({
        transcription_id: result.transcription_id,
        transcript: result.transcript,
        duration_s: result.duration_s,
      });
    } catch (err) {
      next(err);
    } finally {
      // Always delete the temp file after processing
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('[transcribe] Failed to delete temp file:', unlinkErr.message);
        }
      });
    }
  }
);

export default router;
