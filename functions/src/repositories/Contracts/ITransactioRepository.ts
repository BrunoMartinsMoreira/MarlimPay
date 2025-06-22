import {
  CreateTransactionDTO,
  CreateTransactionResult,
  Idempotency,
  Transaction,
} from '../../schemas';

export interface ITransactionRepository {
  createIdempotency(data: Idempotency): Promise<Idempotency>;
  findIdempotency(params: {
    userToken?: string;
    status?: 'finished' | 'active';
    key?: string;
  }): Promise<Idempotency | null>;
  createTransation(
    data: CreateTransactionDTO,
    idempotencyKey: string,
  ): Promise<CreateTransactionResult>;
  findTransactionById(transaction_id: string): Promise<Transaction | null>;
  updateTransactionStatus(
    transaction_id: string,
    status: 'approved' | 'failed',
  ): Promise<void>;
}
