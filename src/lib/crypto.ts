import { createHmac, createHash, randomBytes, timingSafeEqual } from 'crypto';

/** Generate a cryptographically random token, base64url-encoded. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** SHA-256 hash of a string. Returns hex string. */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** HMAC-SHA256 of a string with the given secret. Returns hex string. */
export function hmac(secret: string, input: string): string {
  return createHmac('sha256', secret).update(input).digest('hex');
}

/** Sign a session ID. Returns "<id>.<signature>". */
export function signSession(secret: string, id: string): string {
  return `${id}.${hmac(secret, id)}`;
}

/**
 * Verify and unsign a session cookie value.
 * Returns the session ID on success, or null if the signature is invalid.
 */
export function unsignSession(secret: string, signed: string): string | null {
  const dot = signed.lastIndexOf('.');
  if (dot === -1) return null;
  const id = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  const expected = hmac(secret, id);
  // Constant-time comparison to prevent timing attacks
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return null;
    return timingSafeEqual(a, b) ? id : null;
  } catch {
    return null;
  }
}
