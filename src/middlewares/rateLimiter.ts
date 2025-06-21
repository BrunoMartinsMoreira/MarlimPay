import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { ApplicationError } from '../errors';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,

  keyGenerator: (req: Request): string => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApplicationError('Token obrigatório', 401);
    }

    return authHeader.substring(7);
  },

  handler: (req: Request, res: Response): void => {
    res.status(429).json({
      error: 'Rate limit exceeded',
    });
  },

  standardHeaders: true,
  legacyHeaders: false,

  skip: (req: Request): boolean => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    return false;
  },
});
