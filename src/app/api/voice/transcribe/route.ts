import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { auditAction, AuditEvents } from '@/lib/auth/audit';
import { isServerSttConfigured, transcribeWithGroq } from '@/lib/voice/serverStt';
import type { SttLanguage } from '@/lib/voice/stt';

export async function GET() {
  return NextResponse.json({
    available: isServerSttConfigured(),
    provider: isServerSttConfigured() ? 'groq-whisper' : null,
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isServerSttConfigured()) {
    return NextResponse.json(
      {
        error:
          'Server speech not configured. Add GROQ_API_KEY to .env (free at groq.com) or type numbers manually.',
      },
      { status: 503 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get('audio');
    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: 'No audio uploaded' }, { status: 400 });
    }

    const language = (form.get('language') as SttLanguage) ?? 'ar-IQ';
    const uploadName =
      typeof form.get('filename') === 'string' && form.get('filename')
        ? String(form.get('filename'))
        : file instanceof File && file.name
          ? file.name
          : 'clip.webm';
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await transcribeWithGroq(buffer, uploadName, language);

    await auditAction(request, user, AuditEvents.VOICE_TRANSCRIBE, {
      language,
      fileName: uploadName,
      bytes: buffer.length,
    });

    return NextResponse.json({ text, provider: 'groq-whisper' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
