import express from 'express';
import { UsersHandler } from '../handlers';
import { container } from 'tsyringe';

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
  }

  run() {
    this.post();
    this.put();
    this.get();
    return this.router;
  }
}
