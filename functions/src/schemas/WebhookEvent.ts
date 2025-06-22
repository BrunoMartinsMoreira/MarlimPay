import { WebhookDTO } from './TransactionSchema';

export type WebhookEvent = WebhookDTO & {
  details: string;
};
