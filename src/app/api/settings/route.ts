import { NextResponse } from 'next/server';
import { getSessionUser, getSetting } from '@/lib/auth/session';
import { isServerSttConfigured } from '@/lib/voice/serverStt';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const voiceLanguage = await getSetting('voice_language', 'ar-SA');
  return NextResponse.json({
    voiceLanguage,
    serverSttAvailable: isServerSttConfigured(),
    serverSttProvider: isServerSttConfigured() ? 'groq-whisper' : null,
  });
}
