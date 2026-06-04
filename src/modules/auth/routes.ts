import { Elysia, redirect, status, t } from 'elysia';
import { env } from '../../env';
import { queryClient as sql } from '../../db/client';
import { unsignSession } from '../../lib/crypto';
import { logger } from '../../lib/logger';
import { loadUser, SESSION_COOKIE } from './middleware';
import { sendOtp, verifyOtp, logout } from './service';
import { AuthErrorPage, LoginPage, VerifyPage } from './views';

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function cookieVal(
  cookie: Record<string, { value: unknown } | undefined>,
  name: string,
): string | undefined {
  const v = cookie[name]?.value;
  return typeof v === 'string' ? v : undefined;
}

function setSessionCookie(
  cookie: Record<string, { value: unknown; set: (opts: object) => void } | undefined>,
  value: string,
): void {
  // biome-ignore lint/style/noNonNullAssertion: Elysia always provides this slot
  cookie[SESSION_COOKIE]!.set({
    value,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    secure: env.BASE_URL.startsWith('https'),
  });
}

// ---------------------------------------------------------------------------
// Auth routes
//
// GET  /auth              → sign-in form (enter email)
// POST /auth/send-code    → send OTP to email
// GET  /auth/verify       → enter-code form (email passed via query)
// POST /auth/verify       → verify OTP, create session
// POST /auth/logout       → destroy session
// ---------------------------------------------------------------------------

export const authRoutes = new Elysia()

  // ── GET /auth ─────────────────────────────────────────────────────────────
  .get('/auth', async ({ query, cookie }) => {
    const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
    if (user) return redirect('/');
    return LoginPage({ prefillEmail: query.email });
  }, {
    query: t.Object({ email: t.Optional(t.String()) }),
  })

  // ── POST /auth/send-code ──────────────────────────────────────────────────
  .post(
    '/auth/send-code',
    async ({ body }) => {
      const email = body.email.trim().toLowerCase();

      let result: { error?: string };
      try {
        result = await sendOtp(email);
      } catch (err) {
        logger.error(err, 'sendOtp error');
        return AuthErrorPage({ message: 'Failed to send code. Please try again.' });
      }

      if (result.error) {
        return LoginPage({ error: result.error, prefillEmail: email });
      }

      return VerifyPage({ email });
    },
    { body: t.Object({ email: t.String() }) },
  )

  // ── GET /auth/verify ──────────────────────────────────────────────────────
  .get('/auth/verify', ({ query }) => {
    if (!query.email) return redirect('/auth');
    return VerifyPage({ email: query.email });
  }, {
    query: t.Object({ email: t.Optional(t.String()) }),
  })

  // ── POST /auth/verify ─────────────────────────────────────────────────────
  .post(
    '/auth/verify',
    async ({ body, cookie }) => {
      const email = body.email.trim().toLowerCase();
      const code = body.code.trim();

      let result: { signedSession?: string; error?: string };
      try {
        result = await verifyOtp(email, code);
      } catch (err) {
        logger.error(err, 'verifyOtp error');
        return AuthErrorPage({ message: 'Something went wrong. Please try again.' });
      }

      if (result.error || !result.signedSession) {
        return VerifyPage({ email, error: result.error ?? 'Verification failed.' });
      }

      setSessionCookie(cookie as Parameters<typeof setSessionCookie>[0], result.signedSession);
      return redirect('/');
    },
    { body: t.Object({ email: t.String(), code: t.String() }) },
  )

  // ── POST /auth/logout ─────────────────────────────────────────────────────
  .post('/auth/logout', async ({ cookie }) => {
    const val = cookieVal(cookie, SESSION_COOKIE);
    if (val) {
      const sessionId = unsignSession(env.SESSION_SECRET, val);
      if (sessionId) {
        try {
          await logout(sessionId);
        } catch (err) {
          logger.error(err, 'Failed to delete session on logout');
        }
      }
      // biome-ignore lint/style/noNonNullAssertion: cookie exists
      cookie[SESSION_COOKIE]!.remove();
    }
    return redirect('/');
  })

  // ── GET /api/avatar/:userId ───────────────────────────────────────────────
  .get('/api/avatar/:userId', async ({ params }) => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(params.userId)) return status(404, 'Not found');

    const [row] = await sql<{ avatarSvg: string }[]>`
      SELECT avatar_svg AS "avatarSvg" FROM users WHERE id = ${params.userId}::uuid LIMIT 1
    `;
    if (!row?.avatarSvg) return status(404, 'Not found');

    return new Response(row.avatarSvg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=31536000' },
    });
  }, { params: t.Object({ userId: t.String() }) });
