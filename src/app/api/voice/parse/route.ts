import { NextRequest, NextResponse } from 'next/server';
import { parseVoiceCommand } from '@/lib/voice/parser';
import { getSessionUser } from '@/lib/auth/session';
import { auditAction, AuditEvents } from '@/lib/auth/audit';
import { voiceParseSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = voiceParseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
  }

  const command = parseVoiceCommand(parsed.data.text);
  if (!command) {
    return NextResponse.json(
      {
        error: 'Could not parse command. Say: مخالفة 5، العدد 5، المبلغ 200000',
        hint: 'violation # + count + amount',
      },
      { status: 422 },
    );
  }

  await auditAction(request, user, AuditEvents.VOICE_PARSE, {
    violationIndex: command.violationIndex,
    count: command.count,
    amount: command.amount,
  });

  return NextResponse.json({ command });
}
