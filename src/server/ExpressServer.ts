import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Router } from '../routes';
import { logger, httpLogger } from '../logger';
import { globalErrorHandler, notFoundMiddleware } from '../middlewares';
import { authMiddleware } from '../middlewares/auth';

export class ExpressServer {
  private readonly app: express.Express;
  private readonly router: Router;

  constructor() {
    this.app = express();
    this.router = new Router();
  }

  private configMiddlewares() {
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(httpLogger);
    this.app.use(helmet());
    this.app.use(authMiddleware);
    this.app.use(this.router.run());
    this.app.use(notFoundMiddleware);

    this.app.use(globalErrorHandler as express.ErrorRequestHandler);
  }

  private startServer(): void {
    this.app.listen(3000, () => {
      logger.info('App start on port 3000');
    });
  }

  run() {
    this.configMiddlewares();
    this.startServer();
    return this.app;
  }
}
