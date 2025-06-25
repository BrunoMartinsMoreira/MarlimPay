import { Router as ExpressRouter } from 'express';
import { container } from 'tsyringe';
import { UsersRouter } from './UsersRouter';
import { TransactionRouter } from './TransactionRouter';
import { WebhookRouter } from './WebhookRouter';

export class Router {
  private readonly router: ExpressRouter = ExpressRouter();
  private readonly usersRouter = container.resolve(UsersRouter);
  private readonly transactionsRouter = container.resolve(TransactionRouter);
  private readonly webhookRouter = container.resolve(WebhookRouter);

  run() {
    this.router.use('/users', this.usersRouter.run());
    this.router.use('/transactions', this.transactionsRouter.run());
    this.router.use('/webhook', this.webhookRouter.run());
    return this.router;
  }
}
