import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApplicationError } from '../errors';

export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: 'Dados de entrada inválidos',
      errors: error.errors.map((err) => ({
        field: err.path.length > 0 ? err.path.join('.') : 'root',
        details: err.message,
      })),
    });
  }

  if (error instanceof ApplicationError) {
    return res.status(error.status).json({
      message: error.message,
    });
  }

  return res.status(500).json({
    message: 'Erro interno do servidor',
  });
};
