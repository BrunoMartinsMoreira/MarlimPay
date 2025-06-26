import { WebhookEvent } from '../../schemas';

export interface IWebhookEventsRepository {
  create(data: WebhookEvent): Promise<void>;
  findWebhookEvents(transaction_id?: string): Promise<WebhookEvent[]>;
}
