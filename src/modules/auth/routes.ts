import { Elysia, redirect, t } from 'elysia';
import { env } from '../../env';
import { unsignSession } from '../../lib/crypto';
import { logger } from '../../lib/logger';
import { loadUser, SESSION_COOKIE } from './middleware';
import { consumeLink, logout, requestLink } from './service';
import { AuthCheckEmailPage, AuthErrorPage, AuthPage } from './views';

// ---------------------------------------------------------------------------
// Cookie settings
// ---------------------------------------------------------------------------

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

// Helper: Elysia types dynamic cookie values as unknown — cast to string | undefined.
function cookieVal(cookie: Record<string, { value: unknown } | undefined>, name: string): string | undefined {
  const v = cookie[name]?.value;
  return typeof v === 'string' ? v : undefined;
}

// ---------------------------------------------------------------------------
// Auth routes
// GET  /auth                → magic-link request form
// POST /auth/request        → create magic link, send email
// GET  /auth/verify?token=… → consume link, create session, redirect
// POST /auth/logout         → destroy session, clear cookie
// ---------------------------------------------------------------------------

export const authRoutes = new Elysia()
  // ── GET /auth — sign-in form ─────────────────────────────────────────────
  .get('/auth', async ({ cookie }) => {
    const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
    if (user) {
      return AuthPage({ userEmail: user.email });
    }
    return AuthPage({});
  })

  // ── POST /auth/request — send magic link ─────────────────────────────────
  .post(
    '/auth/request',
    async ({ body }) => {
      const email = body.email.trim().toLowerCase();
      if (!email) {
        return AuthErrorPage({ message: 'Email address is required.' });
      }

      try {
        await requestLink(email);
      } catch (err) {
        // Log but don't surface details — prevents email enumeration
        logger.error(err, 'Failed to send magic link');
      }

      // Always show success to avoid leaking whether an email is registered
      return AuthCheckEmailPage();
    },
    { body: t.Object({ email: t.String() }) },
  )

  // ── GET /auth/verify — consume token, set session cookie ─────────────────
  .get(
    '/auth/verify',
    async ({ query, cookie }) => {
      const { token } = query;
      if (!token) {
        return AuthErrorPage({ message: 'Missing or invalid link. Please request a new one.' });
      }

      let signedSession: string | null;
      try {
        signedSession = await consumeLink(token);
      } catch (err) {
        logger.error(err, 'Error consuming magic link');
        return AuthErrorPage({ message: 'Something went wrong. Please try again.' });
      }

      if (!signedSession) {
        return AuthErrorPage({
          message:
            'This link has expired or has already been used. Please request a new one.',
        });
      }

      // noUncheckedIndexedAccess: dynamic dict access returns T | undefined; non-null is safe
      // here because Elysia auto-creates cookie entries on set()
      // biome-ignore lint/style/noNonNullAssertion: Elysia always provides this slot
      cookie[SESSION_COOKIE]!.set({
        value: signedSession,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        secure: env.BASE_URL.startsWith('https'),
      });

      return redirect('/');
    },
    { query: t.Object({ token: t.Optional(t.String()) }) },
  )

  // ── POST /auth/logout — destroy session ──────────────────────────────────
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
      // biome-ignore lint/style/noNonNullAssertion: cookie exists (we just read its value above)
      cookie[SESSION_COOKIE]!.remove();
    }
    return redirect('/');
  });
