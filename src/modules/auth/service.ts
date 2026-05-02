import { queryClient as sql } from '../../db/client';
import { signSession } from '../../lib/crypto';
import { newId } from '../../lib/ids';
import { env } from '../../env';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// register — create a new user account
// ---------------------------------------------------------------------------

export interface RegisterParams {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export async function register({
  email,
  firstName,
  lastName,
  password,
}: RegisterParams): Promise<{ error?: string }> {
  const normalized = email.trim().toLowerCase();

  // Check if email already taken
  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM users WHERE email = ${normalized} LIMIT 1
  `;
  if (existing) {
    return { error: 'An account with this email already exists.' };
  }

  const passwordHash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });
  const userId = newId();

  await sql`
    INSERT INTO users (id, email, first_name, last_name, password_hash)
    VALUES (
      ${userId}::uuid,
      ${normalized},
      ${firstName.trim()},
      ${lastName.trim()},
      ${passwordHash}
    )
  `;

  return {};
}

// ---------------------------------------------------------------------------
// login — verify credentials, create session, return signed cookie value
// ---------------------------------------------------------------------------

export async function login(
  email: string,
  password: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();

  const [user] = await sql<{ id: string; passwordHash: string }[]>`
    SELECT id, password_hash AS "passwordHash"
    FROM users
    WHERE email = ${normalized}
    LIMIT 1
  `;

  if (!user) return null;

  const valid = await Bun.password.verify(password, user.passwordHash);
  if (!valid) return null;

  const sessionId = newId();
  const sessionExpiry = new Date(Date.now() + SESSION_TTL_MS);

  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (
      ${sessionId}::uuid,
      ${user.id}::uuid,
      ${sessionExpiry.toISOString()}::timestamptz
    )
  `;

  return signSession(env.SESSION_SECRET, sessionId);
}

// ---------------------------------------------------------------------------
// logout — delete session row
// ---------------------------------------------------------------------------

export async function logout(sessionId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}::uuid`;
}
