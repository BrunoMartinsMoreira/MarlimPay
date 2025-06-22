import { getFirestore } from 'firebase-admin/firestore';
import { injectable, singleton } from 'tsyringe';
import { WebhookEvent } from '../schemas';
import { IWebhookEventsRepository } from './Contracts/IWebhookEventsRepository';

@injectable()
@singleton()
export class WebhookEventsRepository implements IWebhookEventsRepository {
  private readonly db = getFirestore();

  async create(data: WebhookEvent): Promise<void> {
    await this.db.collection('webhook_events').add(data);
  }
}
