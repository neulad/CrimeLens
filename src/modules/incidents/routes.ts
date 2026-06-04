import { Elysia, status, t } from 'elysia';
import { logger } from '../../lib/logger';
import { loadUser, SESSION_COOKIE } from '../auth/middleware';
import { createIncident, deleteIncident, getCityIncidents, getIncidentById, updateIncident } from './queries';
import { broadcastIncident } from './live';
import { parseSince } from './service';
import { listByBbox } from './service';
import { IncidentDetailPage, IncidentEditPage, IncidentNotFoundPage } from './views';

function cookieVal(cookie: Record<string, { value: unknown } | undefined>, name: string): string | undefined {
  const v = cookie[name]?.value;
  return typeof v === 'string' ? v : undefined;
}

export const incidentsRoutes = new Elysia()
  // ── GET /incidents/:id — detail page ────────────────────────────────────
  .get(
    '/incidents/:id',
    async ({ params, cookie }) => {
      // Basic UUID guard to avoid hitting the DB with clearly invalid ids
      const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(params.id)) {
        return status(404, IncidentNotFoundPage({}));
      }

      try {
        const [incident, user] = await Promise.all([
          getIncidentById(params.id),
          loadUser(cookieVal(cookie, SESSION_COOKIE)),
        ]);
        if (!incident) {
          return status(404, user ? IncidentNotFoundPage({ userEmail: user.email }) : IncidentNotFoundPage({}));
        }
        return user
          ? IncidentDetailPage({ incident, userEmail: user.email, userId: user.userId })
          : IncidentDetailPage({ incident });
      } catch (err) {
        logger.error(err, 'Failed to fetch incident detail');
        return status(500, 'Internal server error');
      }
    },
    { params: t.Object({ id: t.String() }) },
  )
  // ── GET /api/incidents — bbox JSON feed ──────────────────────────────────
  .get(
    '/api/incidents',
    async ({ query }) => {
    const bboxParts = query.bbox.split(',').map(Number);
    if (bboxParts.length !== 4 || bboxParts.some((n) => Number.isNaN(n))) {
      return status(400, { message: 'bbox must be W,S,E,N (four floats)' });
    }

    const [west, south, east, north] = bboxParts as [number, number, number, number];
    if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
      return status(400, { message: 'bbox coordinates out of valid range' });
    }

    // Guard against NaN slipping through Elysia's t.Number coercion (e.g. limit=abc).
    // NaN comparisons always return false so TypeBox min/max checks silently pass.
    const limit = query.limit;
    if (limit !== undefined && !Number.isFinite(limit)) {
      return status(400, { message: 'limit must be a finite integer between 1 and 1000' });
    }

    try {
      const items = await listByBbox({
        west,
        south,
        east,
        north,
        types: query.types,
        since: query.since,
        limit,
      });

      return { items };
    } catch (err) {
      logger.error(err, 'Failed to query incidents');
      return status(500, { message: 'Internal server error' });
    }
    },
    {
      query: t.Object({
        bbox: t.String({ description: 'W,S,E,N bounding box' }),
        types: t.Optional(t.String()),
        since: t.Optional(t.String()),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 1000, default: 500 })),
      }),
    },
  )
  // ── GET /api/incidents/feed — city-filtered sidebar feed ─────────────────
  .get(
    '/api/incidents/feed',
    async ({ query }) => {
      const city = query.city.trim();
      if (!city) return { items: [] };

      const VALID_TYPES = new Set(['pickpocketing', 'bicycle_stolen', 'street_fight', 'robbery', 'street_scams']);
      const types = query.types
        ? query.types.split(',').filter((t) => VALID_TYPES.has(t))
        : undefined;

      try {
        const items = await getCityIncidents(city, types?.length ? types : undefined, parseSince(query.since), 50);
        return { items };
      } catch (err) {
        logger.error(err, 'Failed to query city feed');
        return status(500, { message: 'Internal server error' });
      }
    },
    {
      query: t.Object({
        city: t.String(),
        types: t.Optional(t.String()),
        since: t.Optional(t.String()),
      }),
    },
  )
  // ── POST /api/incidents — create user-reported incident ───────────────────
  .post(
    '/api/incidents',
    async ({ body, cookie }) => {
      const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
      if (!user) return status(401, { message: 'Sign in to report incidents.' });

      const { lat, lng, crimeType, city, occurredAt, description } = body;

      if (!description.trim()) {
        return status(400, { message: 'Description is required.' });
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return status(400, { message: 'Invalid coordinates.' });
      }

      try {
        const id = await createIncident({
          lat, lng, crimeType, city, occurredAt, description, userId: user.userId,
        });

        broadcastIncident({
          id,
          crimeType,
          city,
          occurredAt,
          description,
          lat,
          lng,
          source: 'USER_REPORTED',
        });

        return { id };
      } catch (err) {
        logger.error(err, 'Failed to create incident');
        return status(500, { message: 'Something went wrong.' });
      }
    },
    {
      body: t.Object({
        lat: t.Number({ minimum: -90, maximum: 90 }),
        lng: t.Number({ minimum: -180, maximum: 180 }),
        crimeType: t.String(),
        city: t.String(),
        occurredAt: t.String(),
        description: t.String(),
      }),
    },
  )

  // ── GET /incidents/:id/edit — edit form (owner only) ─────────────────────
  .get(
    '/incidents/:id/edit',
    async ({ params, cookie }) => {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(params.id)) return status(404, IncidentNotFoundPage({}));

      const [incident, user] = await Promise.all([
        getIncidentById(params.id),
        loadUser(cookieVal(cookie, SESSION_COOKIE)),
      ]);

      if (!incident) return status(404, IncidentNotFoundPage({ userEmail: user?.email }));
      if (!user) return status(302, null, { Location: '/auth' });
      if (incident.createdBy !== user.userId) return status(403, 'Forbidden');

      return IncidentEditPage({ incident, userEmail: user.email });
    },
    { params: t.Object({ id: t.String() }) },
  )

  // ── POST /incidents/:id/edit — save edits (owner only) ───────────────────
  .post(
    '/incidents/:id/edit',
    async ({ params, body, cookie }) => {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(params.id)) return status(404, IncidentNotFoundPage({}));

      const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
      if (!user) return status(302, null, { Location: '/auth' });

      const incident = await getIncidentById(params.id);
      if (!incident) return status(404, IncidentNotFoundPage({ userEmail: user.email }));
      if (incident.createdBy !== user.userId) return status(403, 'Forbidden');

      try {
        await updateIncident(params.id, {
          crimeType: body.crimeType,
          description: body.description,
          occurredAt: body.occurredAt,
        });
      } catch (err) {
        logger.error(err, 'Failed to update incident');
        return IncidentEditPage({ incident, userEmail: user.email, error: 'Something went wrong.' });
      }

      return status(302, null, { Location: `/incidents/${params.id}` });
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ crimeType: t.String(), description: t.String(), occurredAt: t.String() }),
    },
  )

  // ── POST /incidents/:id/delete — delete (owner only) ─────────────────────
  .post(
    '/incidents/:id/delete',
    async ({ params, cookie }) => {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(params.id)) return status(404);

      const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
      if (!user) return status(302, null, { Location: '/auth' });

      const incident = await getIncidentById(params.id);
      if (!incident) return status(404, IncidentNotFoundPage({ userEmail: user.email }));
      if (incident.createdBy !== user.userId) return status(403, 'Forbidden');

      try {
        await deleteIncident(params.id);
      } catch (err) {
        logger.error(err, 'Failed to delete incident');
      }

      return status(302, null, { Location: '/' });
    },
    { params: t.Object({ id: t.String() }) },
  );
