import { Logger } from '@nestjs/common';

const logger = new Logger('LudoArena');

const SECRET_KEYS = new Set(['password', 'token', 'cookie', 'authorization', 'secret']);

export function logEvent(event: string, fields: Record<string, string | number | boolean | null> = {}): void {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SECRET_KEYS.has(key.toLowerCase())) {
      continue;
    }
    safe[key] = value;
  }
  logger.log(JSON.stringify({ event, ...safe }));
}
