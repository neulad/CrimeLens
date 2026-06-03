import postgres from 'postgres';
import { env } from '../env';

export const queryClient = postgres(env.DATABASE_URL);
