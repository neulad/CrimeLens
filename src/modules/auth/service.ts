import { queryClient as sql } from '../../db/client';
import { signSession } from '../../lib/crypto';
import { newId } from '../../lib/ids';
import { env } from '../../env';
import { sendOtpEmail } from '../../lib/mail';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// createSession — internal helper
// ---------------------------------------------------------------------------

async function createSession(userId: string): Promise<string> {
  const sessionId = newId();
  const sessionExpiry = new Date(Date.now() + SESSION_TTL_MS);
  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${sessionId}::uuid, ${userId}::uuid, ${sessionExpiry.toISOString()}::timestamptz)
  `;
  return signSession(env.SESSION_SECRET, sessionId);
}

// ---------------------------------------------------------------------------
// sendOtp — create a 6-digit OTP, store hash, send email
// Returns { error } on failure, {} on success
// ---------------------------------------------------------------------------

export async function sendOtp(email: string): Promise<{ error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return { error: 'Invalid email address.' };

  // Rate-limit: at most 1 OTP per 60 s per email
  const [recent] = await sql<{ id: string }[]>`
    SELECT id FROM email_otps
    WHERE email = ${normalized}
      AND created_at > NOW() - INTERVAL '60 seconds'
      AND consumed_at IS NULL
    LIMIT 1
  `;
  if (recent) return { error: 'A code was already sent. Please wait 60 seconds before requesting another.' };

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  const codeHash = await Bun.password.hash(code, { algorithm: 'bcrypt', cost: 10 });
  const id = newId();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await sql`
    INSERT INTO email_otps (id, email, code_hash, expires_at)
    VALUES (${id}::uuid, ${normalized}, ${codeHash}, ${expiresAt}::timestamptz)
  `;

  await sendOtpEmail(normalized, code);
  return {};
}

// ---------------------------------------------------------------------------
// verifyOtp — check code, upsert user, return signed session
// ---------------------------------------------------------------------------

export async function verifyOtp(
  email: string,
  code: string,
): Promise<{ signedSession?: string; error?: string }> {
  const normalized = email.trim().toLowerCase();

  const [otp] = await sql<{ id: string; codeHash: string }[]>`
    SELECT id, code_hash AS "codeHash"
    FROM email_otps
    WHERE email = ${normalized}
      AND expires_at > NOW()
      AND consumed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!otp) return { error: 'Code expired or not found. Please request a new one.' };

  const valid = await Bun.password.verify(code.trim(), otp.codeHash);
  if (!valid) return { error: 'Incorrect code.' };

  // Mark consumed
  await sql`UPDATE email_otps SET consumed_at = NOW() WHERE id = ${otp.id}::uuid`;

  // Upsert user (creates account on first login)
  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM users WHERE email = ${normalized} LIMIT 1
  `;

  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    userId = newId();
    // Derive a display name from the email local part
    const local = normalized.split('@')[0] ?? '';
    const firstName = local.split(/[\s._\-+]+/)[0] ?? local;
    const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

    let avatarSvg = '';
    try {
      const res = await fetch(`https://api.dicebear.com/9.x/lorelei/svg?seed=${userId}`);
      if (res.ok) avatarSvg = await res.text();
    } catch { /* non-fatal */ }

    await sql`
      INSERT INTO users (id, email, first_name, last_name, password_hash, avatar_svg)
      VALUES (
        ${userId}::uuid,
        ${normalized},
        ${capitalized},
        '',
        '',
        ${avatarSvg}
      )
    `;
  }

  const signedSession = await createSession(userId);
  return { signedSession };
}

// ---------------------------------------------------------------------------
// logout — delete session row
// ---------------------------------------------------------------------------

export async function logout(sessionId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}::uuid`;
}

// ---------------------------------------------------------------------------
// updateProfile — save name + contacts
// ---------------------------------------------------------------------------

export interface ProfileParams {
  firstName: string;
  lastName: string;
  contactWhatsapp?: string;
  contactTelegram?: string;
  contactFacebook?: string;
  contactPhone?: string;
}

export async function updateProfile(userId: string, params: ProfileParams): Promise<void> {
  await sql`
    UPDATE users
    SET first_name        = ${params.firstName.trim()},
        last_name         = ${params.lastName.trim()},
        contact_whatsapp  = ${params.contactWhatsapp?.trim() || null},
        contact_telegram  = ${params.contactTelegram?.trim() || null},
        contact_facebook  = ${params.contactFacebook?.trim() || null},
        contact_phone     = ${params.contactPhone?.trim() || null}
    WHERE id = ${userId}::uuid
  `;
}

// ---------------------------------------------------------------------------
// requestEmailChange — send OTP to new address, store as pending
// ---------------------------------------------------------------------------

export async function requestEmailChange(
  userId: string,
  newEmail: string,
): Promise<{ error?: string }> {
  const normalized = newEmail.trim().toLowerCase();
  if (!normalized.includes('@')) return { error: 'Invalid email address.' };

  // Check not already taken
  const [taken] = await sql<{ id: string }[]>`
    SELECT id FROM users WHERE email = ${normalized} AND id <> ${userId}::uuid LIMIT 1
  `;
  if (taken) return { error: 'That email is already in use.' };

  // Store as pending
  await sql`UPDATE users SET pending_email = ${normalized} WHERE id = ${userId}::uuid`;

  // Send OTP to the NEW address
  return sendOtp(normalized);
}

// ---------------------------------------------------------------------------
// confirmEmailChange — verify OTP sent to pending_email, apply the change
// ---------------------------------------------------------------------------

export async function confirmEmailChange(
  userId: string,
  code: string,
): Promise<{ error?: string }> {
  const [user] = await sql<{ pendingEmail: string | null }[]>`
    SELECT pending_email AS "pendingEmail" FROM users WHERE id = ${userId}::uuid LIMIT 1
  `;
  if (!user?.pendingEmail) return { error: 'No pending email change found.' };

  const result = await verifyOtp(user.pendingEmail, code);
  if (result.error) return { error: result.error };

  await sql`
    UPDATE users SET email = pending_email, pending_email = NULL WHERE id = ${userId}::uuid
  `;
  // Invalidate all existing sessions so the new email is reflected on next login
  await sql`DELETE FROM sessions WHERE user_id = ${userId}::uuid`;
  return {};
}
