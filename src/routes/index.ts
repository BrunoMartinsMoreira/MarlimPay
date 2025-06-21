import { Router as ExpressRouter } from 'express';
import { UsersRouter } from './UsersRouter';
import { container } from 'tsyringe';
import { TransactionRouter } from './TransactionRouter';

export class Router {
  private readonly router: ExpressRouter = ExpressRouter();
  private readonly usersRouter = container.resolve(UsersRouter);
  private readonly transactionsRouter = container.resolve(TransactionRouter);

  run() {
    this.router.use('/users', this.usersRouter.run());
    this.router.use('/transactions', this.transactionsRouter.run());
    return this.router;
  }
}
