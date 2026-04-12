/**
 * seed/run.ts — wipes the incidents table and reloads from incidents.json.
 *
 * Usage:
 *   bun run seed
 *
 * Implemented in Week 5 once the data model is locked and ~500 incidents
 * have been authored in incidents.json.
 */
import { db } from '../src/db/client';
import { incidents } from '../src/db/schema';

async function seed() {
  const data = await import('./incidents.json');
  const rows: typeof data.default = data.default;

  console.log(`Seeding ${rows.length} incidents…`);

  await db.delete(incidents);

  if (rows.length === 0) {
    console.log('incidents.json is empty — nothing to insert.');
    return;
  }

  // Batch insert in chunks of 100
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    // biome-ignore lint/suspicious/noExplicitAny: seed row shape varies until Week 5
    await (db.insert(incidents) as any).values(rows.slice(i, i + CHUNK));
  }

  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
