import { Elysia } from 'elysia';

// Incidents routes — implemented in Week 6.
// GET  /api/incidents       → bbox + filter query → JSON { items: Incident[] }
// POST /api/incidents       → create a new incident (authenticated)
// GET  /incidents/:id       → full detail page
export const incidentsRoutes = new Elysia();
