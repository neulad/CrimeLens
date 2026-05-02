import { Elysia, redirect, t } from 'elysia';
import { env } from '../../env';
import { unsignSession } from '../../lib/crypto';
import { logger } from '../../lib/logger';
import { loadUser, SESSION_COOKIE } from './middleware';
import { login, logout, register } from './service';
import { AuthErrorPage, LoginPage, RegisterPage } from './views';

// ---------------------------------------------------------------------------
// Cookie settings
// ---------------------------------------------------------------------------

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function cookieVal(
  cookie: Record<string, { value: unknown } | undefined>,
  name: string,
): string | undefined {
  const v = cookie[name]?.value;
  return typeof v === 'string' ? v : undefined;
}

// ---------------------------------------------------------------------------
// Auth routes
// GET  /auth           → login form
// POST /auth/login     → verify credentials, create session
// GET  /auth/register  → registration form
// POST /auth/register  → create account
// POST /auth/logout    → destroy session, clear cookie
// ---------------------------------------------------------------------------

export const authRoutes = new Elysia()
  // ── GET /auth — login form ────────────────────────────────────────────────
  .get('/auth', async ({ cookie }) => {
    const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
    if (user) return LoginPage({ userEmail: user.displayName });
    return LoginPage({});
  })

  // ── POST /auth/login — verify credentials ─────────────────────────────────
  .post(
    '/auth/login',
    async ({ body, cookie }) => {
      const email = body.email.trim().toLowerCase();
      const { password } = body;

      let signedSession: string | null;
      try {
        signedSession = await login(email, password);
      } catch (err) {
        logger.error(err, 'Login error');
        return AuthErrorPage({ message: 'Something went wrong. Please try again.' });
      }

      if (!signedSession) {
        return LoginPage({ error: 'Incorrect email or password.' });
      }

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
    { body: t.Object({ email: t.String(), password: t.String() }) },
  )

  // ── GET /auth/register — registration form ────────────────────────────────
  .get('/auth/register', () => RegisterPage({}))

  // ── POST /auth/register — create account ──────────────────────────────────
  .post(
    '/auth/register',
    async ({ body, cookie }) => {
      const email = body.email.trim().toLowerCase();
      const firstName = body.firstName.trim();
      const lastName = body.lastName.trim();
      const { password } = body;

      if (password.length < 8) {
        return RegisterPage({
          error: 'Password must be at least 8 characters.',
          prefill: { email, firstName, lastName },
        });
      }

      let result: { error?: string | undefined };
      try {
        result = await register({ email, firstName, lastName, password });
      } catch (err) {
        logger.error(err, 'Registration error');
        return AuthErrorPage({ message: 'Something went wrong. Please try again.' });
      }

      if (result.error) {
        return RegisterPage({
          error: result.error,
          prefill: { email, firstName, lastName },
        });
      }

      // Auto-login after registration
      const signedSession = await login(email, password);
      if (!signedSession) {
        // Shouldn't happen — just send them to sign in
        return redirect('/auth');
      }

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
    {
      body: t.Object({
        email: t.String(),
        firstName: t.String(),
        lastName: t.String(),
        password: t.String(),
      }),
    },
  )

  // ── POST /auth/logout — destroy session ───────────────────────────────────
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
  });
