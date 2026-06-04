import { env } from '../env';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// sendOtpEmail
// Sends a 6-digit sign-in code to the given address.
//
// Modes (controlled by env.MAIL_MODE):
//   console (default) — log to stdout; no real email sent.
//                       Safe for local dev / Docker without credentials.
//   gmail             — send via Gmail API using env.GMAIL_TOKEN (OAuth2
//                       access token provided by the team later).
// ---------------------------------------------------------------------------

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (env.MAIL_MODE !== 'gmail') {
    // Console mode — print to server log so the dev can copy the code
    logger.info(
      `\n${'─'.repeat(60)}\n📧  OTP CODE (console mode — no real email sent)\n   To:   ${to}\n   Code: ${code}\n${'─'.repeat(60)}`,
    );
    return;
  }

  // Gmail API mode — requires GMAIL_TOKEN (short-lived OAuth2 access token)
  if (!env.GMAIL_TOKEN) {
    throw new Error('GMAIL_TOKEN is required when MAIL_MODE=gmail');
  }

  const subject = 'Your CrimeLens sign-in code';
  const body = [
    `Your CrimeLens sign-in code is: ${code}`,
    '',
    'It expires in 15 minutes. If you didn\'t request this, ignore this email.',
  ].join('\n');

  // RFC 2822 message, base64url encoded
  const raw = btoa(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`,
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GMAIL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gmail API error ${res.status}: ${errBody}`);
  }
}
