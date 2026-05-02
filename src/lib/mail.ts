import { env } from '../env';
import { logger } from './logger';

interface MagicLinkPayload {
  to: string;
  url: string;
}

/** Send a magic-link email. In console mode, prints to stdout instead. */
export async function sendMagicLink({ to, url }: MagicLinkPayload): Promise<void> {
  if (env.MAIL_MODE === 'console') {
    logger.info(
      `\n${'─'.repeat(60)}\n🔗  MAGIC LINK (console mode)\n   To:  ${to}\n   URL: ${url}\n${'─'.repeat(60)}`,
    );
    return;
  }

  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required when MAIL_MODE=resend');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'CrimeLens <onboarding@resend.dev>',
      to: [to],
      subject: 'Your CrimeLens sign-in link',
      html: `<p>Click the link below to sign in. It expires in 15 minutes and can only be used once.</p>
             <p><a href="${url}">${url}</a></p>
             <p>If you didn't request this, ignore this email.</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}
