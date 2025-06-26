import { getFirestore } from 'firebase-admin/firestore';
import { injectable, singleton } from 'tsyringe';
import { WebhookEvent } from '../schemas';
import { IWebhookEventsRepository } from '.';

@injectable()
@singleton()
export class WebhookEventsRepository implements IWebhookEventsRepository {
  private readonly db = getFirestore();

  async create(data: WebhookEvent): Promise<void> {
    await this.db.collection('webhook_events').add(data);
  }

  async findWebhookEvents(transaction_id?: string): Promise<WebhookEvent[]> {
    let query = this.db.collection('webhook_events') as FirebaseFirestore.Query;
    if (transaction_id) {
      query = query.where('transaction_id', '==', transaction_id);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    const logs = snapshot.docs.map((doc) => {
      return doc.data() as WebhookEvent;
    });

    return logs;
  }
}
