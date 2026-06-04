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

const MAX_IMAGE_B64 = 5 * 1024 * 1024; // 5 MB base64 string limit

export const lostFoundRoutes = new Elysia()
  // ── GET /lost-and-found — public list ─────────────────────────────────────
  .get(
    '/lost-and-found',
    async ({ cookie, query }) => {
      const statusFilter = (['LOST', 'FOUND'] as const).find((s) => s === query.status) ?? 'ALL';
      const ownerFilter  = query.owner === 'MINE' ? 'MINE' : 'ALL';

      const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));

      const items = await listItems({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        onlyUserId: ownerFilter === 'MINE' && user ? user.userId : undefined,
      });

      return LostFoundListPage({
        items,
        userEmail: user?.displayName,
        userId: user?.userId,
        statusFilter,
        ownerFilter,
      });
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        owner: t.Optional(t.String()),
      }),
    },
  )

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

      const { title, category, status: itemStatus, city, occurredAt, description,
              contactPhone, contactWhatsapp, contactTelegram, imageData } = body;

      if (!title.trim() || !city.trim() || !description.trim() || !occurredAt) {
        return LostFoundNewPage({ userEmail: user.displayName, error: 'All required fields must be filled in.' });
      }

      if (imageData && imageData.length > MAX_IMAGE_B64) {
        return LostFoundNewPage({ userEmail: user.displayName, error: 'Image is too large. Please choose a smaller image.' });
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
          contactPhone: contactPhone || undefined,
          contactWhatsapp: contactWhatsapp || undefined,
          contactTelegram: contactTelegram || undefined,
          imageData: imageData || undefined,
        });
      } catch (err) {
        logger.error(err, 'Failed to create lost-and-found item');
        return LostFoundNewPage({ userEmail: user.displayName, error: 'Something went wrong. Please try again.' });
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
        contactPhone: t.Optional(t.String()),
        contactWhatsapp: t.Optional(t.String()),
        contactTelegram: t.Optional(t.String()),
        imageData: t.Optional(t.String()),
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
