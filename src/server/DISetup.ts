import { container } from 'tsyringe';
import {
  IUserRepository,
  UserRepository,
  ITransactionRepository,
  TransactionRepository,
  IWebhookEventsRepository,
  WebhookEventsRepository,
} from '../repositories';

export const TOKENS = {
  UserRepository: Symbol('UserRepository'),
  TransactionRepository: Symbol('TransactionRepository'),
  WebhookEventsRepository: Symbol('WebhookEventsRepository'),
} as const;

export function DISetup() {
  container.registerSingleton<IUserRepository>(
    TOKENS.UserRepository,
    UserRepository,
  );
  container.register<ITransactionRepository>(
    TOKENS.TransactionRepository,
    TransactionRepository,
  );
  container.register<IWebhookEventsRepository>(
    TOKENS.WebhookEventsRepository,
    WebhookEventsRepository,
  );
}
