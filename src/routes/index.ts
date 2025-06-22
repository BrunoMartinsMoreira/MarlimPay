import { Router as ExpressRouter } from 'express';
import { UsersRouter } from './UsersRouter';

export class Router {
  private readonly router: ExpressRouter;
  private readonly usersRouter: UsersRouter;
  constructor() {
    this.router = ExpressRouter();
    this.usersRouter = new UsersRouter();
  }

  run() {
    this.router.use('/users', this.usersRouter.run());
    return this.router;
  }
}
