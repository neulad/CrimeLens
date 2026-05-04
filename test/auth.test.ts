import { describe, expect, it } from 'bun:test';

// Auth integration tests — implemented in Week 10.
// Tests: requestLink creates a magic_link row, consumeLink sets consumed_at,
// expired link is rejected, reused link is rejected, session cookie is signed.
describe('auth', () => {
  it.todo('requestLink creates a magic_link row');
  it.todo('consumeLink sets consumed_at and creates a session');
  it.todo('expired link returns 400');
  it.todo('reused link returns 400');
});
