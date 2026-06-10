import type { SttLanguage } from './stt';

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export function isServerSttConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

function mimeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.mp4') || lower.endsWith('.aac')) return 'audio/mp4';
  if (lower.endsWith('.wav')) return 'audio/wav';
  return 'audio/webm';
}

const ARABIC_FINES_PROMPT =
  'مخالفات مرورية عراقية. أرقام المخالفات من 1 إلى 59، عدد الحالات، مبالغ بالدينار العراقي. Iraqi traffic fines numbers 1-59, counts, amounts in IQD.';

export async function transcribeWithGroq(
  audioBuffer: Buffer,
  filename: string,
  language: SttLanguage,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const langCode = language.startsWith('ar') ? 'ar' : 'en';
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeForFilename(filename) });
  const form = new FormData();
  form.append('file', blob, filename);
  form.append('model', 'whisper-large-v3');
  form.append('language', langCode);
  form.append('response_format', 'json');
  form.append('temperature', '0');
  if (langCode === 'ar') form.append('prompt', ARABIC_FINES_PROMPT);

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq STT failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as { text?: string };
  return (json.text ?? '').trim();
}
