import { Elysia } from 'elysia';
import { cookieVal } from '../../lib/http';
import { loadUser, SESSION_COOKIE } from '../auth/middleware';
import { MapPage } from './layout';

export const pagesRoutes = new Elysia().get('/', async ({ cookie }) => {
  const user = await loadUser(cookieVal(cookie, SESSION_COOKIE));
  if (user) {
    return MapPage({ userEmail: user.displayName, isAuthenticated: true, userId: user.userId, hasAvatar: user.hasAvatar });
  }
  return MapPage({});
});
