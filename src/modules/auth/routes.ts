import { Elysia } from 'elysia';

// Auth routes — implemented in Week 6.
// GET  /auth                → magic-link request form
// POST /auth/request        → create magic link, send email
// GET  /auth/verify?token=… → consume link, create session, redirect
// POST /auth/logout         → destroy session, clear cookie
export const authRoutes = new Elysia();
