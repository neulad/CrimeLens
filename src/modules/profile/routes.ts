import { Elysia, redirect, status, t } from 'elysia';
import { logger } from '../../lib/logger';
import { loadUser, SESSION_COOKIE } from '../auth/middleware';
import { updateProfile, requestEmailChange, confirmEmailChange } from '../auth/service';
import { getProfile } from './service';
import { ProfilePage } from './views';

function cookieVal(
  cookie: Record<string, { value: unknown } | undefined>,
  name: string,
): string | undefined {
  const v = cookie[name]?.value;
  return typeof v === 'string' ? v : undefined;
}

export const profileRoutes = new Elysia()

  // ── GET /profile ──────────────────────────────────────────────────────────
  .get('/profile', async ({ cookie, query }) => {
    const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
    if (!user) return redirect('/auth');

    const profile = await getProfile(user.userId);
    if (!profile) return redirect('/auth');

    return ProfilePage({
      profile,
      userEmail: user.email,
      saved: query.saved === '1',
    });
  }, {
    query: t.Object({ saved: t.Optional(t.String()) }),
  })

  // ── POST /profile — save name + contacts ─────────────────────────────────
  .post(
    '/profile',
    async ({ body, cookie }) => {
      const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
      if (!user) return redirect('/auth');

      try {
        await updateProfile(user.userId, {
          firstName: body.firstName,
          lastName: body.lastName ?? '',
          contactWhatsapp: body.contactWhatsapp,
          contactTelegram: body.contactTelegram,
          contactFacebook: body.contactFacebook,
          contactPhone: body.contactPhone,
        });
      } catch (err) {
        logger.error(err, 'Failed to update profile');
        const profile = await getProfile(user.userId);
        if (!profile) return redirect('/auth');
        return ProfilePage({ profile, userEmail: user.email, error: 'Failed to save. Please try again.' });
      }

      return redirect('/profile?saved=1');
    },
    {
      body: t.Object({
        firstName: t.String(),
        lastName: t.Optional(t.String()),
        contactWhatsapp: t.Optional(t.String()),
        contactTelegram: t.Optional(t.String()),
        contactFacebook: t.Optional(t.String()),
        contactPhone: t.Optional(t.String()),
      }),
    },
  )

  // ── POST /profile/change-email — send OTP to new email ───────────────────
  .post(
    '/profile/change-email',
    async ({ body, cookie }) => {
      const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
      if (!user) return redirect('/auth');

      const profile = await getProfile(user.userId);
      if (!profile) return redirect('/auth');

      let result: { error?: string };
      try {
        result = await requestEmailChange(user.userId, body.newEmail);
      } catch (err) {
        logger.error(err, 'requestEmailChange error');
        return ProfilePage({ profile, userEmail: user.email, emailChangeError: 'Failed to send code. Try again.' });
      }

      if (result.error) {
        return ProfilePage({ profile, userEmail: user.email, emailChangeError: result.error });
      }

      return ProfilePage({ profile, userEmail: user.email, emailChangeSent: true });
    },
    { body: t.Object({ newEmail: t.String() }) },
  )

  // ── POST /profile/confirm-email — verify OTP, apply email change ─────────
  .post(
    '/profile/confirm-email',
    async ({ body, cookie }) => {
      const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
      if (!user) return redirect('/auth');

      const profile = await getProfile(user.userId);
      if (!profile) return redirect('/auth');

      let result: { error?: string };
      try {
        result = await confirmEmailChange(user.userId, body.code);
      } catch (err) {
        logger.error(err, 'confirmEmailChange error');
        return ProfilePage({ profile, userEmail: user.email, emailChangeSent: true, emailChangeError: 'Something went wrong.' });
      }

      if (result.error) {
        return ProfilePage({ profile, userEmail: user.email, emailChangeSent: true, emailChangeError: result.error });
      }

      // Email changed — session invalidated by confirmEmailChange, force re-login
      // biome-ignore lint/style/noNonNullAssertion: Elysia always provides this slot
      cookie[SESSION_COOKIE]!.remove();
      return status(302, null, { Location: '/auth?email=' + encodeURIComponent(profile.pendingEmail ?? '') });
    },
    { body: t.Object({ code: t.String() }) },
  );
