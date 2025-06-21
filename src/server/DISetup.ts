import { container } from 'tsyringe';
import {
  IUserRepository,
  UserRepository,
  ITransactionRepository,
  TransactionRepository,
} from '../repositories';

export const TOKENS = {
  UserRepository: Symbol('UserRepository'),
  TransactionRepository: Symbol('TransactionRepository'),
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
}
