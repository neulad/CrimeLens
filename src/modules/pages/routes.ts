import { Elysia } from 'elysia';
import { loadUser, SESSION_COOKIE } from '../auth/middleware';
import { MapPage } from './layout';

function cookieVal(cookie: Record<string, { value: unknown } | undefined>, name: string): string | undefined {
  const v = cookie[name]?.value;
  return typeof v === 'string' ? v : undefined;
}

export const pagesRoutes = new Elysia().get('/', async ({ cookie }) => {
  const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
  if (user) {
    return MapPage({ userEmail: user.displayName });
  }
  return MapPage({});
});
