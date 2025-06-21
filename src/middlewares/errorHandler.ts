import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApplicationError } from '../errors';

interface ErrorResponse {
  message: string;
  errors?: Array<{
    field: string;
    details: string;
  }>;
}

export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let errorResponse: ErrorResponse = {
    message: 'Erro interno do servidor',
  };

  if (error instanceof z.ZodError) {
    errorResponse = {
      message: 'Dados de entrada inválidos',
      errors: error.errors.map((err) => ({
        field: err.path.length > 0 ? err.path.join('.') : 'root',
        details: err.message,
      })),
    };
    statusCode = 409;
  }

  if (error instanceof ApplicationError) {
    errorResponse = {
      message: error.message,
    };
    statusCode = error.status;
  }

  return res.status(statusCode).json(errorResponse);
};
