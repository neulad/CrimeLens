import { env } from '../../env';
import { queryClient as sql } from '../../db/client';
import { generateToken, sha256, signSession } from '../../lib/crypto';
import { newId } from '../../lib/ids';
import { sendMagicLink } from '../../lib/mail';

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// requestLink — upsert user, create magic_link row, send email
// ---------------------------------------------------------------------------

export async function requestLink(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();

  // Upsert user (email is citext + unique — conflict means user exists)
  const userId = newId();
  await sql`
    INSERT INTO users (id, email)
    VALUES (${userId}::uuid, ${normalized})
    ON CONFLICT (email) DO NOTHING
  `;

  // Re-select to get the actual id (may be the one we just inserted or a pre-existing one)
  const [user] = await sql<{ id: string }[]>`
    SELECT id FROM users WHERE email = ${normalized} LIMIT 1
  `;
  if (!user) throw new Error('User not found after upsert');

  // Generate token — store only the hash
  const token = generateToken(32);
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await sql`
    INSERT INTO magic_links (id, user_id, token_hash, expires_at)
    VALUES (
      ${newId()}::uuid,
      ${user.id}::uuid,
      ${tokenHash},
      ${expiresAt.toISOString()}::timestamptz
    )
  `;

  const url = `${env.BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`;
  await sendMagicLink({ to: normalized, url });
}

// ---------------------------------------------------------------------------
// consumeLink — validate token, mark consumed, create session
// ---------------------------------------------------------------------------

export async function consumeLink(token: string): Promise<string | null> {
  const tokenHash = sha256(token);

  const [link] = await sql<{
    id: string;
    userId: string;
    expiresAt: string;
    consumedAt: string | null;
  }[]>`
    SELECT
      id,
      user_id       AS "userId",
      expires_at    AS "expiresAt",
      consumed_at   AS "consumedAt"
    FROM magic_links
    WHERE token_hash = ${tokenHash}
    LIMIT 1
  `;

  if (!link) return null;
  if (link.consumedAt) return null; // already used
  if (new Date(link.expiresAt) < new Date()) return null; // expired

  // Mark consumed — one-time use
  await sql`
    UPDATE magic_links SET consumed_at = NOW() WHERE id = ${link.id}::uuid
  `;

  // Create session
  const sessionId = newId();
  const sessionExpiry = new Date(Date.now() + SESSION_TTL_MS);

  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (
      ${sessionId}::uuid,
      ${link.userId}::uuid,
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
