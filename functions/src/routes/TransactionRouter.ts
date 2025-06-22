import express from 'express';
import { TransactionHandler } from '../handlers';
import { container } from 'tsyringe';
import { rateLimiter } from '../middlewares/rateLimiter';

export class TransactionRouter {
  private readonly router = express.Router();
  private readonly handler = container.resolve(TransactionHandler);

  private post() {
    this.router.post('/idempotency/generate', (req, res) =>
      this.handler.generateIdempotencyKey(req, res),
    );
    this.router.post('/', rateLimiter, (req, res) =>
      this.handler.createTransaction(req, res),
    );
  }

  private get() {
    this.router.get('/:transaction_id', (req, res) =>
      this.handler.findTransactionById(req, res),
    );
  }

  run() {
    this.post();
    this.get();
    return this.router;
  }
}
