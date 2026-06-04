import postgres from 'postgres';
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
const sql = postgres(process.env.DATABASE_URL!);

async function seed() {
  console.log(`Seeding ${rows.length} incidents…`);

  await sql`DELETE FROM incidents WHERE source = 'SEEDED'`;

  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    for (const row of chunk) {
      await sql`
        INSERT INTO incidents (id, crime_type, occurred_at, location, city, description, source, created_by)
        VALUES (
          ${row.id}::uuid,
          ${row.crimeType},
          ${row.occurredAt}::timestamptz,
          ST_SetSRID(ST_MakePoint(${row.lng}::float8, ${row.lat}::float8), 4326),
          ${row.city},
          ${row.description},
          ${row.source},
          NULL
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`  inserted ${Math.min(i + CHUNK, rows.length)} / ${rows.length}`);
  }

  console.log('Seed complete.');
  await sql.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
