import { sql } from 'drizzle-orm';
import { check, customType, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// PostGIS geometry(Point, 4326) — Drizzle doesn't ship this natively.
// The migration hands the actual SQL; here we only need the TS type wrapper.
const geometry = customType<{ data: string; driverData: string }>({
  dataType: () => 'geometry(Point, 4326)',
});

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  // citext is applied in the migration via ALTER TABLE … TYPE citext
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// incidents
// ---------------------------------------------------------------------------
export const incidents = pgTable(
  'incidents',
  {
    id: uuid('id').primaryKey(),
    crimeType: text('crime_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    location: geometry('location').notNull(),
    city: text('city').notNull(),
    description: text('description').notNull(),
    source: text('source').notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_incidents_location').using('gist', t.location),
    index('idx_incidents_occurred_at').on(t.occurredAt.desc()),
    index('idx_incidents_crime_type').on(t.crimeType),
    check(
      'crime_type_check',
      sql`${t.crimeType} in ('pickpocketing','bag_snatching','theft_from_vehicle','other')`,
    ),
    check('source_check', sql`${t.source} in ('SEEDED','USER_REPORTED')`),
  ],
);

// ---------------------------------------------------------------------------
// lost_items
// ---------------------------------------------------------------------------
export const lostItems = pgTable(
  'lost_items',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    category: text('category').notNull(),
    status: text('status').notNull(),
    city: text('city').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    description: text('description').notNull(),
    location: geometry('location'), // optional map pin
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_lost_items_created_at').on(t.createdAt.desc()),
    index('idx_lost_items_user_id').on(t.userId),
    check(
      'category_check',
      sql`${t.category} in ('phone','bag','wallet','keys','documents','other')`,
    ),
    check('status_check', sql`${t.status} in ('LOST','FOUND')`),
  ],
);
