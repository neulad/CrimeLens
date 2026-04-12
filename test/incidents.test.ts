import { describe, it } from 'bun:test';

// Incidents integration tests — implemented in Week 10.
// Tests: GET /api/incidents requires bbox, returns items within bbox,
// filters by type, filters by since, POST requires auth.
describe('incidents', () => {
  it.todo('GET /api/incidents returns 400 without bbox');
  it.todo('GET /api/incidents returns incidents within bbox');
  it.todo('filters by crime type');
  it.todo('filters by time window');
  it.todo('POST /api/incidents returns 401 when unauthenticated');
});
