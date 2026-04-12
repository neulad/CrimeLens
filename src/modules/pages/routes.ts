import { Elysia } from 'elysia';
import { MapPage } from './layout';

export const pagesRoutes = new Elysia().get('/', () => MapPage({}));
