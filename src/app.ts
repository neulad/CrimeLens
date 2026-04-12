import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { staticPlugin } from '@elysiajs/static';
import { env } from './env';
import { logger } from './lib/logger';
import { pagesRoutes } from './modules/pages/routes';
import { authRoutes } from './modules/auth/routes';
import { incidentsRoutes } from './modules/incidents/routes';
import { lostFoundRoutes } from './modules/lost-and-found/routes';

const app = new Elysia()
  // Enable @kitajs/html JSX responses
  .use(html())
  // Serve ./public at /  (e.g. /css/app.css, /js/map.js, /img/favicon.svg)
  .use(staticPlugin({ assets: 'public', prefix: '/' }))
  // Feature routes
  .use(pagesRoutes)
  .use(authRoutes)
  .use(incidentsRoutes)
  .use(lostFoundRoutes)
  .listen(env.PORT);

logger.info(`CrimeLens listening on http://localhost:${env.PORT}`);

export type App = typeof app;
