import { uuidv7 } from 'uuidv7';

/** Generate a new UUIDv7 — time-sortable, index-friendly primary key. */
export const newId = (): string => uuidv7();
