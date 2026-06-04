import postgres from 'postgres';
import { readdir, readFile } from 'fs/promises';

const sql = postgres(process.env.DATABASE_URL!);

await sql`
  CREATE TABLE IF NOT EXISTS _migrations (
    name       TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

// Legacy-DB guard: if the users table already exists, the first two migrations
// have effectively been applied. Mark them so the destructive 0001 (which wipes
// users/sessions) never re-runs against a pre-existing database.
const [usersExists] = await sql`
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1
`;
if (usersExists) {
  await sql`
    INSERT INTO _migrations (name)
    VALUES ('0000_init.sql'), ('0001_password_auth.sql')
    ON CONFLICT DO NOTHING
  `;
}

const applied = new Set(
  (await sql`SELECT name FROM _migrations`).map((r) => r.name as string),
);

const files = (await readdir('./migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  if (applied.has(file)) continue;
  const content = await readFile(`./migrations/${file}`, 'utf8');
  await sql.unsafe(content);
  await sql`INSERT INTO _migrations (name) VALUES (${file})`;
  console.log(`✓ applied ${file}`);
}

console.log('[✓] migrations applied successfully!');
await sql.end();
