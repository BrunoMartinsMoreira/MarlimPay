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

  private get() {
    return this.router.get('/logs', (req, res) =>
      this.handler.findWebhookEvents(req, res),
    );
  }

  run() {
    this.post();
    this.get();
    return this.router;
  }
}
