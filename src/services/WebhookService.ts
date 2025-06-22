import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../server/DISetup';
import {
  ITransactionRepository,
  IUserRepository,
  IWebhookEventsRepository,
} from '../repositories';
import { WebhookDTO } from '../schemas';

@injectable()
export class WebhookService {
  constructor(
    @inject(TOKENS.UserRepository)
    private readonly usersRepository: IUserRepository,
    @inject(TOKENS.TransactionRepository)
    private readonly transactionsRepository: ITransactionRepository,
    @inject(TOKENS.WebhookEventsRepository)
    private readonly webhookEventsRepository: IWebhookEventsRepository,
  ) {}

  async updateTransaction({ status, transaction_id }: WebhookDTO) {
    try {
      const transaction =
        await this.transactionsRepository.findTransactionById(transaction_id);

      if (!transaction) {
        await this.webhookEventsRepository.create({
          status,
          transaction_id,
          details: JSON.stringify({
            status: 'error',
            details: 'Não foi encontrada transação para o id informado',
          }),
        });

        return;
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

      if (!payer || !receiver) return;

      if (status === 'failed') {
        const logDetail = `Trasanção falhou valor ${amount} devolvido ao pagador ${payer_id} - ${payer.name}`;

        await Promise.all([
          this.usersRepository.updateUserAmount(
            payer.balance + amount,
            payer_id,
          ),
          this.usersRepository.updateUserAmount(
            receiver.balance - amount,
            receiver_id,
          ),
          this.webhookEventsRepository.create({
            status,
            transaction_id,
            details: JSON.stringify({
              status: 'error',
              details: logDetail,
            }),
          }),
        ]);
      }

      return;
    } catch (error) {
      await this.webhookEventsRepository.create({
        status,
        transaction_id,
        details: JSON.stringify({
          status: 'error',
          details: JSON.stringify(error),
        }),
      });
    }
  }
}
