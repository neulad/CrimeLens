import { Elysia, status, t } from 'elysia';
import { logger } from '../../lib/logger';
import { getIncidentById } from './queries';
import { listByBbox } from './service';
import { IncidentDetailPage, IncidentNotFoundPage } from './views';

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
        const incident = await getIncidentById(params.id);
        if (!incident) return status(404, IncidentNotFoundPage({}));
        return IncidentDetailPage({ incident });
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
  );
