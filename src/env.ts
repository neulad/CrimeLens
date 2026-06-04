function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function requireMailMode(): 'console' | 'gmail' {
  const val = process.env.MAIL_MODE ?? 'console';
  if (val !== 'console' && val !== 'gmail') {
    throw new Error(`Invalid MAIL_MODE="${val}". Must be "console" or "gmail".`);
  }
  return val;
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  SESSION_SECRET: requireEnv('SESSION_SECRET'),
  BASE_URL: process.env.BASE_URL ?? 'http://localhost:3000',
  PORT: Number(process.env.PORT ?? 3000),
  MAIL_MODE: requireMailMode(),
  GMAIL_FROM: process.env.GMAIL_FROM,          // e.g. yourname@gmail.com
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD, // 16-char Google App Password
} as const;
