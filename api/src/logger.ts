import pino from 'pino';
import { env, isProd } from './env.js';

// Logging configuration constants
export const LOG_LEVEL = isProd ? 'info' : 'debug';

export const logger = pino({
  level: LOG_LEVEL,
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
});

// Convenience methods for structured logging
export const log = {
  info: (msg: string, data?: object) => logger.info(data, msg),
  warn: (msg: string, data?: object) => logger.warn(data, msg),
  error: (msg: string, data?: object) => logger.error(data, msg),
  debug: (msg: string, data?: object) => logger.debug(data, msg),
};
