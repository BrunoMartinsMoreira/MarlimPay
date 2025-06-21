import { Request, Response, NextFunction } from 'express';
import { ApplicationError } from '../errors';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApplicationError('Token de acesso não fornecido', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new ApplicationError('Formato de token inválido', 401);
    }

    const token = authHeader.substring(7);

    if (!token || token.trim() === '') {
      throw new ApplicationError('Token não pode estar vazio', 401);
    }

    if (!isValidMockedToken(token)) {
      throw new ApplicationError('Token inválido', 401);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const isValidMockedToken = (token: string): boolean => {
  const validTokens = [
    'c4338945-cb15-40fa-b726-076b24cddb86',
    '536c931b-090b-4d5c-a23f-eba452c197cb',
  ];
  return validTokens.includes(token);
};
