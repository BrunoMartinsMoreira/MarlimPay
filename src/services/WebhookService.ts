import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../server/DISetup';
import { ITransactionRepository, IUserRepository } from '../repositories';
import { WebhookDTO } from '../schemas';
import { ApplicationError } from '../errors';

@injectable()
export class WebhookService {
  constructor(
    @inject(TOKENS.UserRepository)
    private readonly usersRepository: IUserRepository,
    @inject(TOKENS.TransactionRepository)
    private readonly transactionsRepository: ITransactionRepository,
  ) {}

  async updateTransaction({ status, transaction_id }: WebhookDTO) {
    const transaction =
      await this.transactionsRepository.findTransactionById(transaction_id);

    if (!transaction) {
      throw new ApplicationError(
        'Não foi encontrada transação para o id informado',
        404,
      );
    }

    await this.transactionsRepository.updateTransactionStatus(
      transaction_id,
      status,
    );

    const { payer_id, receiver_id, amount } = transaction;

    const [payer, receiver] = await Promise.all([
      this.usersRepository.findById(payer_id),
      this.usersRepository.findById(receiver_id),
    ]);

    if (status === 'failed') {
      await Promise.all([
        this.usersRepository.updateUserAmount(payer.balance + amount, payer_id),
        this.usersRepository.updateUserAmount(
          receiver.balance - amount,
          receiver_id,
        ),
      ]);
    }

    return;
  }
}
