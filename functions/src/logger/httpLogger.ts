import pinoHttp, { Options } from 'pino-http';
import { IncomingMessage, ServerResponse } from 'http';
import { logger } from './logger';

export const httpLogger = pinoHttp({
  logger,
  customLogLevel(req, res, err): 'info' | 'warn' | 'error' {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage(
    req: IncomingMessage,
    res: ServerResponse,
    rs: number,
  ): string {
    return `${req.method} ${req.baseUrl} - ${res.statusCode} - ${rs.toFixed(2)}ms`;
  },
  customErrorMessage(
    req: IncomingMessage,
    res: ServerResponse,
    err: Error,
  ): string {
    return `${req.method} ${req.baseUrl} - ${res.statusCode} - ERROR: ${err.message}`;
  },
  serializers: {
    req() {
      return;
    },
    res() {
      return;
    },
    responseTime() {
      return;
    },
  },
} satisfies Options);
