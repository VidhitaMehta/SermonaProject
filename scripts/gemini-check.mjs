// Quick Gemini health check: which models your key can use, and how fast they answer.
import 'dotenv/config';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.log('No GEMINI_API_KEY found in .env');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: key });

console.log('\n1) Flash models your key can use:');
try {
  const pager = await ai.models.list();
  const names = [];
  for await (const m of pager) {
    if (/flash/i.test(m.name) && (m.supportedActions || []).includes('generateContent')) names.push(m.name.replace('models/', ''));
  }
  console.log('   ' + (names.join(', ') || '(none found)'));
} catch (e) {
  console.log('   could not list models:', e.message);
}

const candidates = [
  ...(process.env.GEMINI_MODEL || '').split(',').map((s) => s.trim()).filter(Boolean),
  'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash',
  'gemini-flash-lite-latest', 'gemini-flash-latest',
];

console.log('\n2) Speed test (tiny prompt, 20 s limit each):');
for (const model of [...new Set(candidates)]) {
  for (const thinking of [true, false]) {
    const t = Date.now();
    try {
      const r = await Promise.race([
        ai.models.generateContent({
          model,
          contents: 'Reply with just: OK',
          config: thinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {},
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('no answer within 20 s')), 20000)),
      ]);
      console.log(`   ✅ ${model}${thinking ? ' (low thinking)' : ''}: ${Date.now() - t} ms → "${(r.text || '').trim().slice(0, 20)}"`);
      break;
    } catch (e) {
      console.log(`   ❌ ${model}${thinking ? ' (low thinking)' : ''}: ${Date.now() - t} ms → ${String(e.message).slice(0, 140)}`);
      if (!/thinking/i.test(String(e.message))) break;
    }
  }
}
process.exit(0);