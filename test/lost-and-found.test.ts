import { describe, it } from 'bun:test';

// Lost-and-found integration tests — implemented in Week 10.
describe('lost-and-found', () => {
  it.todo('GET /lost-and-found returns the item list');
  it.todo('POST /lost-and-found creates an item when authenticated');
  it.todo('POST /lost-and-found returns 401 when unauthenticated');
  it.todo('DELETE own item succeeds');
  it.todo('DELETE another user item returns 403');
});
