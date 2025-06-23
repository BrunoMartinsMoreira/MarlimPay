import {
  CreateTransactionDTO,
  CreateTransactionResult,
  Idempotency,
  Transaction,
} from '../../schemas';

export type CompleteTransactionDTO = {
  transaction_id: string;
  status: 'approved' | 'failed';
  balance: number;
  user_id: string;
};

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
  completeTransaction(data: CompleteTransactionDTO): Promise<void>;
}
