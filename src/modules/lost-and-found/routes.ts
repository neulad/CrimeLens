import { Elysia } from 'elysia';

// Lost-and-found routes — implemented in Week 7.
// GET  /lost-and-found          → item list page (public)
// GET  /lost-and-found/new      → submit form (authenticated)
// POST /lost-and-found          → create item (authenticated)
// POST /lost-and-found/:id/delete → delete own item (authenticated, owner)
export const lostFoundRoutes = new Elysia();
