import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await client.execute({ sql: 'DELETE FROM login_attempts', args: [] });
await client.execute({ sql: "DELETE FROM app_settings WHERE key LIKE 'lockout_until:%'", args: [] });
console.log('All login lockouts cleared.');
