import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb, schema } from './index';
import { resolveAdminCredentials } from './defaults';

async function updateDefaultAdmin() {
  const { email, username, password } = resolveAdminCredentials();
  const db = getDb();
  const admins = await db.select().from(schema.users).where(eq(schema.users.role, 'admin'));

  if (admins.length === 0) {
    console.log('No admin user found — run db:seed first.');
    return;
  }

  for (const admin of admins) {
    await db
      .update(schema.users)
      .set({
        email,
        username,
        passwordHash: await bcrypt.hash(password, 12),
      })
      .where(eq(schema.users.id, admin.id));
  }

  console.log(`Updated ${admins.length} admin account(s): ${username}`);
}

updateDefaultAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
