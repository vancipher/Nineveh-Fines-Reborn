/** Fire-and-forget client audit log (PNG exports, etc.) */
export function logClientAudit(
  eventType: string,
  summary: string,
  details?: Record<string, unknown>,
) {
  fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, summary, details }),
  }).catch(() => null);
}
