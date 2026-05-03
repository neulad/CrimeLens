import { Elysia, redirect, status, t } from 'elysia';
import { logger } from '../../lib/logger';
import { loadUser, SESSION_COOKIE } from '../auth/middleware';
import { createItem, deleteItem, listItems } from './service';
import {
  LostFoundListPage,
  LostFoundNewPage,
  LostFoundUnauthorizedPage,
} from './views';

function cookieVal(
  cookie: Record<string, { value: unknown } | undefined>,
  name: string,
): string | undefined {
  const v = cookie[name]?.value;
  return typeof v === 'string' ? v : undefined;
}

export const lostFoundRoutes = new Elysia()
  // ── GET /lost-and-found — public list ─────────────────────────────────────
  .get('/lost-and-found', async ({ cookie }) => {
    const [user, items] = await Promise.all([
      loadUser(cookieVal(cookie, SESSION_COOKIE)),
      listItems(),
    ]);
    return LostFoundListPage({
      items,
      userEmail: user?.displayName,
      userId: user?.userId,
    });
  })

  // ── GET /lost-and-found/new — submission form (auth required) ─────────────
  .get('/lost-and-found/new', async ({ cookie }) => {
    const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
    if (!user) return LostFoundUnauthorizedPage();
    return LostFoundNewPage({ userEmail: user.displayName });
  })

  // ── POST /lost-and-found — create item (auth required) ────────────────────
  .post(
    '/lost-and-found',
    async ({ body, cookie }) => {
      const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
      if (!user) return LostFoundUnauthorizedPage();

      const { title, category, status: itemStatus, city, occurredAt, description } = body;

      if (!title.trim() || !city.trim() || !description.trim() || !occurredAt) {
        return LostFoundNewPage({
          userEmail: user.displayName,
          error: 'All fields are required.',
        });
      }

      try {
        await createItem({
          userId: user.userId,
          title,
          category,
          status: itemStatus,
          city,
          occurredAt,
          description,
        });
      } catch (err) {
        logger.error(err, 'Failed to create lost-and-found item');
        return LostFoundNewPage({
          userEmail: user.displayName,
          error: 'Something went wrong. Please try again.',
        });
      }

      return redirect('/lost-and-found');
    },
    {
      body: t.Object({
        title: t.String(),
        category: t.String(),
        status: t.String(),
        city: t.String(),
        occurredAt: t.String(),
        description: t.String(),
      }),
    },
  )

  // ── POST /lost-and-found/:id/delete — delete own item ─────────────────────
  .post(
    '/lost-and-found/:id/delete',
    async ({ params, cookie }) => {
      const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
      if (!user) return status(401, 'Unauthorized');

      try {
        await deleteItem(params.id, user.userId);
      } catch (err) {
        logger.error(err, 'Failed to delete lost-and-found item');
      }

      return redirect('/lost-and-found');
    },
    { params: t.Object({ id: t.String() }) },
  );
