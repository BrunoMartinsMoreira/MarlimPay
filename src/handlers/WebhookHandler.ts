import { container, injectable } from 'tsyringe';
import { Request, Response } from 'express';
import { WebhookService } from '../services';
import { webhoohSchema, WebhookDTO } from '../schemas';

@injectable()
export class WebhookHandler {
  private readonly webhookService = container.resolve(WebhookService);

  async updatePayment(req: Request, res: Response) {
    const webhookDTO: WebhookDTO = webhoohSchema.parse(req.body);

    await this.webhookService.updateTransaction(webhookDTO);
    res.status(200).send({
      message: 'Webhook recebido com sucesso',
    });
  }
}
