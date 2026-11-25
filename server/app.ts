import express from 'express';
import dotenv from 'dotenv';
import { analyzeConversation, getAnalysisConfig } from './analyze.ts';
import { getGroqModel } from './groq.ts';

dotenv.config();
const app = express();
app.use(express.json({ limit: '10mb' }));
app.get('/api/status', (_req, res) => {
  const config = getAnalysisConfig();
  res.json({ status: 'ok', hasGroqKey: Boolean(process.env.GROQ_API_KEY), primaryProvider: process.env.GROQ_API_KEY ? 'groq' : 'gemini', groqModel: getGroqModel(), hasGeminiKey: Boolean(process.env.GEMINI_API_KEY), model: config.models[0], models: config.models, timeoutMs: config.timeoutMs, mode: process.env.NODE_ENV || 'development' });
});
app.post('/api/analyze-conversation', async (req, res) => {
  if (!Array.isArray(req.body?.messages) || req.body.messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required and must not be empty' });
    return;
  }
  try {
    res.json(await analyzeConversation(req.body));
  } catch (error) {
    console.error('Conversation analysis failed:', error);
    res.status(500).json({ error: 'Failed to analyze conversation' });
  }
});
export default app;
