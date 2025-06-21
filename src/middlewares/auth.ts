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
    req.userToken = token;
    next();
  } catch (error) {
    next(error);
  }
};

const isValidMockedToken = (token: string): boolean => {
  const validTokens = [
    'user_token_01',
    'user_token_02',
    'user_token_03',
    'user_token_04',
  ];
  return validTokens.includes(token);
};
