import { z } from 'zod';

export const transactionSchema = z
  .object({
    payer_id: z
      .string({ required_error: 'payer_id é obrigatório' })
      .min(1, 'payer_id é obrigatório'),
    receiver_id: z
      .string({ required_error: 'receiver_id é obrigatório' })
      .min(1, 'receiver_id é obrigatório'),
    amount: z
      .number({ required_error: 'amount é obrigatório' })
      .positive('amount deve ser maior que zero'),
  })
  .refine((data) => data.payer_id !== data.receiver_id, {
    message: 'payer_id e receiver_id devem ser diferentes',
    path: ['receiver_id'],
  });

export const idempotencyKeyHeaderSchema = z
  .string({
    required_error: 'Chave de idempotencia obrivatoria',
  })
  .min(1, 'Chave de idempotencia obrivatoria');

export const headersSchema = z.object({
  idempotencyKey: z
    .string({
      required_error: 'Chave de idempotencia obrigatoria',
    })
    .min(1, 'Chave de idempotencia obrigatoria'),
  userToken: z
    .string({
      required_error: 'User token obrigatorio',
    })
    .min(1, 'User token obrigatorio'),
});

export const webhoohSchema = z.object({
  transaction_id: z
    .string({ required_error: 'transaction_id é obrigatório' })
    .min(1, 'transaction_id é obrigatório'),
  status: z.enum(['approved', 'failed']),
});

export const transactionParamsSchema = z.object({
  transaction_id: z
    .string({ required_error: 'transaction_id é obrigatório' })
    .min(1, 'transaction_id é obrigatório'),
});

export type TransactionStatus = 'approved' | 'failed' | 'pendig';

export type CreateTransactionDTO = z.infer<typeof transactionSchema> & {
  status: TransactionStatus;
};

export type CreateTransactionResult = {
  transaction_id: string;
  status: TransactionStatus;
  created_at: Date;
};

export type Transaction = CreateTransactionDTO & CreateTransactionResult;

export type WebhookDTO = z.infer<typeof webhoohSchema>;

export type ListTransactionItem = {
  transaction_id: string;
  direction: 'sent' | 'received';
  amount: number;
  status: TransactionStatus;
};

export type Idempotency = {
  userToken: string;
  key: string;
  status: 'finished' | 'active';
};
