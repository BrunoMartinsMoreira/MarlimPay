import { inject, injectable } from 'tsyringe';
import { CreateTransactionDTO, Idempotency } from '../schemas';
import { randomUUID } from 'crypto';
import { ITransactionRepository, IUserRepository } from '../repositories';
import { ApplicationError } from '../errors';
import { TOKENS } from '../server/DISetup';

@injectable()
export class TransactionService {
  constructor(
    @inject(TOKENS.TransactionRepository)
    private readonly transactionRepository: ITransactionRepository,
    @inject(TOKENS.UserRepository)
    private readonly usersRepository: IUserRepository,
  ) {}

  async generateIdempotencyKey(userToken?: string) {
    if (!userToken) {
      throw new ApplicationError('User token não informado', 400);
    }

    const activeIdempotency = await this.transactionRepository.findIdempotency({
      userToken,
      status: 'active',
    });

    if (activeIdempotency) return activeIdempotency;

    const idempotencyData: Idempotency = {
      userToken,
      key: randomUUID(),
      status: 'active',
    };

    const data: Idempotency =
      await this.transactionRepository.createIdempotency(idempotencyData);

    return data;
  }

  async createTransaction(data: {
    dto: CreateTransactionDTO;
    idempotencyKey: string;
    userToken: string;
  }) {
    const { dto, idempotencyKey, userToken } = data;
    const idempotencyData = await this.transactionRepository.findIdempotency({
      key: idempotencyKey,
    });

    if (!idempotencyData || idempotencyData.userToken !== userToken) {
      throw new ApplicationError('Chave de idempotencia invalida', 412);
    }

    if (idempotencyData.status !== 'active') {
      throw new ApplicationError('Chave de idempotencia já utilizada', 409);
    }

    const { payer_id, receiver_id, amount } = dto;

    const [payer, receiver] = await Promise.all([
      this.usersRepository.findById(payer_id),
      this.usersRepository.findById(receiver_id),
    ]);

    if (!payer || !receiver) {
      throw new ApplicationError('Pagador ou recebedor invalidos', 404);
    }

    if (amount > payer.balance) {
      throw new ApplicationError('Saldo insuficiente para essa transação', 412);
    }

    const createTransactionResult =
      await this.transactionRepository.createTransation(
        {
          ...dto,
          status: 'pendig',
        },
        idempotencyKey,
      );

    return createTransactionResult;
  }

  async findTransactionById(transaction_id: string) {
    const transaction =
      await this.transactionRepository.findTransactionById(transaction_id);

    if (!transaction) {
      throw new ApplicationError('Transaçaõ não encontrada', 404);
    }

    return transaction;
  }
}
