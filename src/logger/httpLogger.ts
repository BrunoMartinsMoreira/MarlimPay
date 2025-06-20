import pinoHttp, { Options } from 'pino-http';
import { IncomingMessage, ServerResponse } from 'http';
import { logger } from './logger';
import { Request, Response } from 'express';

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
    return `${req.method} ${req.url} - ${res.statusCode} - ${rs.toFixed(2)}ms`;
  },
  customErrorMessage(
    req: IncomingMessage,
    res: ServerResponse,
    err: Error,
  ): string {
    return `${req.method} ${req.url} - ${res.statusCode} - ERROR: ${err.message}`;
  },
  serializers: {
    req(req: Request) {
      return { id: req.id, url: req.url, method: req.method };
    },
    res(res: Response) {
      return {
        status: res.statusCode,
      };
    },
    responseTime() {
      return;
    },
  },
} satisfies Options);
