import { Elysia, status, t } from 'elysia';
import { logger } from '../../lib/logger';
import { listByBbox } from './service';

export const incidentsRoutes = new Elysia().get(
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

    try {
      const items = await listByBbox({
        west,
        south,
        east,
        north,
        types: query.types,
        since: query.since,
        limit: query.limit,
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
