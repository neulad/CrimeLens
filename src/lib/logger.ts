function fmt(level: string, msg: string, extra?: unknown): string {
  const base = `[${level}] ${msg}`;
  return extra ? `${base} ${JSON.stringify(extra)}` : base;
}

export const logger = {
  info:  (msg: string)                 => console.log(fmt('INFO', msg)),
  error: (extra: unknown, msg: string) => console.error(fmt('ERROR', msg, extra)),
  warn:  (msg: string)                 => console.warn(fmt('WARN', msg)),
};
