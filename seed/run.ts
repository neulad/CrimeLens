import { sql } from 'drizzle-orm';
import { db } from '../src/db/client';
import { incidents } from '../src/db/schema';
import rawData from './incidents.json';

type SeedRow = {
  id: string;
  crimeType: string;
  occurredAt: string;
  lat: number;
  lng: number;
  city: string;
  description: string;
  source: string;
};

const rows = rawData as SeedRow[];

async function seed() {
  console.log(`Seeding ${rows.length} incidents…`);

  if (rows.length === 0) {
    console.log('incidents.json is empty — nothing to insert.');
    return;
  }

  // Wrap delete + inserts in a single transaction so a crash mid-seed
  // does not leave the table empty or partially populated.
  await db.transaction(async (tx) => {
    await tx.delete(incidents);

    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      // biome-ignore lint/suspicious/noExplicitAny: sql`` expressions in values() don't satisfy Drizzle's value type
      await (tx.insert(incidents) as any).values(
        chunk.map((row) => ({
          id: row.id,
          crimeType: row.crimeType,
          occurredAt: new Date(row.occurredAt),
          // Use ST_MakePoint so the geometry is built server-side from plain floats
          location: sql`ST_SetSRID(ST_MakePoint(${row.lng}::float8, ${row.lat}::float8), 4326)`,
          city: row.city,
          description: row.description,
          source: row.source,
          createdBy: null,
        })),
      );
    }
  });

  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
