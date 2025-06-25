import { injectable, container } from 'tsyringe';
import { WebhookHandler } from '../handlers';
import express from 'express';

@injectable()
export class WebhookRouter {
  private readonly router = express.Router();
  private readonly handler = container.resolve(WebhookHandler);

  private post() {
    this.router.post('/payment-gateway', (req, res) =>
      this.handler.updatePayment(req, res),
    );
  }

  run() {
    this.post();
    return this.router;
  }
}
