import { Request, Response, NextFunction } from 'express';

export const notFoundMiddleware = (
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  const response = {
    status: 404,
    message: `Recurso não encontrado`,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  };

  res.status(404).send(response);
};
