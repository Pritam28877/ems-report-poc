import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { runAgentAnalysis } from '../services/agent.service';

const router = Router();

const AnalyzeBodySchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters'),
  transcription_id: z.number().int().positive().optional(),
});

/**
 * POST /api/agent/analyze
 * Body: { transcript: string, transcription_id?: number }
 * Returns: Server-Sent Events stream
 */
router.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  const parseResult = AnalyzeBodySchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: 'Invalid request body',
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { transcript, transcription_id } = parseResult.data;

  // SSE headers are set inside runAgentAnalysis, but we handle errors here
  // in case the headers haven't been flushed yet
  try {
    await runAgentAnalysis(transcript, transcription_id, res);
  } catch (err) {
    // If headers not sent yet, send JSON error
    if (!res.headersSent) {
      const message = err instanceof Error ? err.message : 'Agent analysis failed';
      res.status(500).json({ error: message });
    }
    // Otherwise the error is handled inside runAgentAnalysis with SSE error event
  }
});

export default router;
