import { html } from '@elysiajs/html';
import { staticPlugin } from '@elysiajs/static';
import { Elysia } from 'elysia';
import { env } from './env';
import { logger } from './lib/logger';
import { authRoutes } from './modules/auth/routes';
import { addClient, removeClient } from './modules/incidents/live';
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
    open(ws) {
      addClient(ws);
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
