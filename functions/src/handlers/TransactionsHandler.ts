import { Request, Response } from 'express';
import { container, injectable } from 'tsyringe';
import { TransactionService } from '../services';
import {
  transactionSchema,
  headersSchema,
  transactionParamsSchema,
} from '../schemas';

@injectable()
export class TransactionHandler {
  private readonly transactionService = container.resolve(TransactionService);

  async generateIdempotencyKey(req: Request, res: Response) {
    const idempotencyData =
      await this.transactionService.generateIdempotencyKey(req.userToken);
    res.status(201).send(idempotencyData);
  }

  async createTransaction(req: Request, res: Response) {
    const createTransactionDTO = transactionSchema.parse(req.body);
    const { idempotencyKey, userToken } = headersSchema.parse({
      idempotencyKey:
        req.headers['idempotency-key'] || req.headers['Idempotency-Key'],
      userToken: req.userToken,
    });

    const transaction = await this.transactionService.createTransaction({
      dto: { ...createTransactionDTO, status: 'pendig' },
      idempotencyKey,
      userToken,
    });

    res.status(201).send(transaction);
  }

  async findTransactionById(req: Request, res: Response) {
    const { transaction_id } = transactionParamsSchema.parse({
      transaction_id: req.params.transaction_id,
    });
    const transaction =
      await this.transactionService.findTransactionById(transaction_id);
    res.status(200).send(transaction);
  }
}
