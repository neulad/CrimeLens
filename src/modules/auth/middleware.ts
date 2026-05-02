import { env } from '../../env';
import { queryClient as sql } from '../../db/client';
import { unsignSession } from '../../lib/crypto';

export interface UserSession {
  sessionId: string;
  userId: string;
  email: string;
}

export const SESSION_COOKIE = 'session';

// ---------------------------------------------------------------------------
// loadUser — reads session cookie, verifies HMAC, returns user or null
// ---------------------------------------------------------------------------

export async function loadUser(cookieValue: string | undefined): Promise<UserSession | null> {
  if (!cookieValue) return null;

  const sessionId = unsignSession(env.SESSION_SECRET, cookieValue);
  if (!sessionId) return null;

  const [row] = await sql<{ userId: string; email: string }[]>`
    SELECT s.user_id AS "userId", u.email
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sessionId}::uuid
      AND s.expires_at > NOW()
    LIMIT 1
  `;

  if (!row) return null;
  return { sessionId, userId: row.userId, email: row.email };
}
