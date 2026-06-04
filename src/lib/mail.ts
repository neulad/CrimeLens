import nodemailer from 'nodemailer';
import { env } from '../env';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// sendOtpEmail
// MAIL_MODE=console  → prints code to stdout (dev default, no credentials needed)
// MAIL_MODE=gmail    → sends via Gmail SMTP with an App Password
// ---------------------------------------------------------------------------

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (env.MAIL_MODE !== 'gmail') {
    logger.info(
      `\n${'─'.repeat(60)}\n📧  OTP CODE (console mode — no real email sent)\n   To:   ${to}\n   Code: ${code}\n${'─'.repeat(60)}`,
    );
    return;
  }

  if (!env.GMAIL_FROM || !env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_FROM and GMAIL_APP_PASSWORD are required when MAIL_MODE=gmail');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.GMAIL_FROM,
      pass: env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `CrimeLens <${env.GMAIL_FROM}>`,
    to,
    subject: 'Your CrimeLens sign-in code',
    text: `Your CrimeLens sign-in code is: ${code}\n\nIt expires in 15 minutes. If you didn't request this, ignore this email.`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:400px;margin:0 auto">
        <h2 style="color:#111827">Your CrimeLens sign-in code</h2>
        <p style="font-size:2rem;font-weight:700;letter-spacing:0.25em;color:#2563eb;background:#eff6ff;padding:0.75rem 1rem;border-radius:0.5rem;text-align:center">${code}</p>
        <p style="color:#6b7280;font-size:0.875rem">This code expires in 15 minutes. If you didn't request it, you can safely ignore this email.</p>
      </div>
    `,
  });
}
