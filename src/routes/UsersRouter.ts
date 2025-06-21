import express, { Request, Response } from 'express';
import { UsersHandler } from '../handlers';

export class UsersRouter {
  private router: express.Router;
  private readonly usersHandler: UsersHandler;

  constructor() {
    this.router = express.Router();
    this.usersHandler = new UsersHandler();
  }

  private post() {
    this.router.post('/', (req: Request, res: Response) =>
      this.usersHandler.createUser(req, res),
    );
  }

  private put() {
    this.router.put('/:user_id', (req: Request, res: Response) =>
      this.usersHandler.updateUser(req, res),
    );
  }

  private get() {
    this.router.get('/:user_id', (req: Request, res: Response) =>
      this.usersHandler.getUser(req, res),
    );
  }

  run() {
    this.post();
    this.put();
    this.get();
    return this.router;
  }
}
