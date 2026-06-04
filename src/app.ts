import { html } from '@elysiajs/html';
import { staticPlugin } from '@elysiajs/static';
import { Elysia } from 'elysia';
import { env } from './env';
import { logger } from './lib/logger';
import { authRoutes } from './modules/auth/routes';
import { addClient, removeClient } from './modules/incidents/live';
import { getRecentIncidents } from './modules/incidents/queries';
import { incidentsRoutes } from './modules/incidents/routes';
import { pagesRoutes } from './modules/pages/routes';
import { profileRoutes } from './modules/profile/routes';

const app = new Elysia()
  // Enable @kitajs/html JSX responses
  .use(html())
  // Serve ./public at /  (e.g. /css/app.css, /js/map.js, /img/favicon.svg)
  .use(staticPlugin({ assets: 'public', prefix: '/' }))
  // Feature routes
  .use(pagesRoutes)
  .use(authRoutes)
  .use(incidentsRoutes)
  .use(profileRoutes)
  .ws('/ws/incidents', {
    async open(ws) {
      addClient(ws);
      // Seed the new client with the last 20 incidents
      try {
        const recent = await getRecentIncidents(20);
        ws.send(JSON.stringify({ type: 'recent', items: recent.map((r) => ({
          id: r.id,
          crimeType: r.crimeType,
          city: r.city,
          occurredAt: r.occurredAt instanceof Date ? r.occurredAt.toISOString() : String(r.occurredAt),
          description: r.description,
          lat: r.lat,
          lng: r.lng,
          source: r.source,
        })) }));
      } catch (err) {
        logger.error(err, 'Failed to seed WS client with recent incidents');
      }
    },
    close(ws) {
      removeClient(ws);
    },
    message() {},
  })
  .listen(env.PORT);

logger.info(`CrimeLens listening on http://localhost:${env.PORT}`);

// Graceful shutdown — let in-flight requests finish before the process exits.
const shutdown = async () => {
  logger.info('Shutting down…');
  await app.stop();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export type App = typeof app;
