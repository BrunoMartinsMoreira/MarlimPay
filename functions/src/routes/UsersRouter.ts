import express from 'express';
import { UsersHandler } from '../handlers';
import { container, injectable } from 'tsyringe';

@injectable()
export class UsersRouter {
  private readonly router = express.Router();
  private readonly handler = container.resolve(UsersHandler);

  private post() {
    this.router.post('/', (req, res) => this.handler.createUser(req, res));
  }

  private put() {
    this.router.put('/:user_id', (req, res) =>
      this.handler.updateUser(req, res),
    );
  }

  private get() {
    this.router.get('/:user_id', (req, res) => this.handler.getUser(req, res));
    this.router.get('/:user_id/transactions', (req, res) =>
      this.handler.findAllTransactionsByUserId(req, res),
    );
  }

  run() {
    this.post();
    this.put();
    this.get();
    return this.router;
  }
}
