import { describe, it } from 'bun:test';

// Auth integration tests (email OTP flow) — implemented in Week 10.
// Tests: sendOtp creates an email_otps row, verifyOtp consumes it and creates a
// session, wrong codes increment attempts and lock after the limit, expired
// codes are rejected, and the session cookie is HMAC-signed.
describe('auth', () => {
  it.todo('sendOtp creates an email_otps row and rate-limits within 60s');
  it.todo('verifyOtp with correct code consumes it and creates a session');
  it.todo('verifyOtp with wrong code increments attempts');
  it.todo('OTP locks after 5 failed attempts');
  it.todo('expired code returns an error');
});
