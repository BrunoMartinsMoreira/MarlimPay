import { Request, Response, NextFunction } from 'express';

export const notFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const response = {
      status: 404,
      message: 'Recurso não encontrado',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
    };

    res.status(404).send(response);
  } catch (error) {
    next(error);
  }
};
