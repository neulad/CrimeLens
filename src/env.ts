function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function requireMailMode(): 'console' | 'resend' {
  const val = process.env.MAIL_MODE ?? 'console';
  if (val !== 'console' && val !== 'resend') {
    throw new Error(`Invalid MAIL_MODE="${val}". Must be "console" or "resend".`);
  }
  return val;
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  SESSION_SECRET: requireEnv('SESSION_SECRET'),
  BASE_URL: process.env.BASE_URL ?? 'http://localhost:3000',
  PORT: Number(process.env.PORT ?? 3000),
  MAIL_MODE: requireMailMode(),
  RESEND_API_KEY: process.env.RESEND_API_KEY,
} as const;
