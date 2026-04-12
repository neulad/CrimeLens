import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

// postgres() creates a lazy connection pool — no connection is made until the
// first query, so the app boots fine even if the DB isn't up yet.
const queryClient = postgres(env.DATABASE_URL);

export const db = drizzle(queryClient, { schema, logger: false });
