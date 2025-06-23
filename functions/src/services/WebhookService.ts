import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../server/DISetup';
import {
  ITransactionRepository,
  IUserRepository,
  IWebhookEventsRepository,
} from '../repositories';
import { Transaction, User, WebhookDTO } from '../schemas';

interface TransactionData {
  transaction: Transaction;
  payer: User;
  receiver: User;
}

interface WebhookEventData {
  status: string;
  details: string;
}

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

  private readonly statusHandlers = {
    failed: this.handleFailedTransaction.bind(this),
    approved: this.handleApprovedTransaction.bind(this),
  };

  async updateTransaction({
    status,
    transaction_id,
  }: WebhookDTO): Promise<void> {
    try {
      const transaction =
        await this.transactionsRepository.findTransactionById(transaction_id);

      if (!transaction) {
        await this.logWebhookEvent(status, transaction_id, {
          status: 'error',
          details: 'Não foi encontrada transação para o id informado',
        });
        return;
      }

      if (transaction.status !== 'pending') return;
      await this.transactionsRepository.updateTransactionStatus(
        transaction_id,
        status,
      );

      const transactionData = await this.getTransactionData(transaction);
      if (!transactionData) return;

      const handler = this.statusHandlers[status];
      if (!handler) return;

      const eventData = await handler(transactionData);
      await this.logWebhookEvent(status, transaction_id, eventData);
    } catch (error) {
      await this.logWebhookEvent(status, transaction_id, {
        status: 'error',
        details: JSON.stringify(error),
      });
    }
  }

  private async getTransactionData(
    transaction: Transaction,
  ): Promise<TransactionData | null> {
    const { payer_id, receiver_id } = transaction;

    const [payer, receiver] = await Promise.all([
      this.usersRepository.findById(payer_id),
      this.usersRepository.findById(receiver_id),
    ]);

    if (!payer || !receiver) return null;

    return { transaction, payer, receiver };
  }

  private async handleFailedTransaction({
    transaction,
    payer,
  }: TransactionData): Promise<WebhookEventData> {
    const { amount, payer_id } = transaction;

    await this.usersRepository.updateUserBalance(
      payer.balance + amount,
      payer_id,
    );

    return {
      status: 'error',
      details: `Transação falhou! Valor ${amount} devolvido ao pagador ${payer_id} - ${payer.name}`,
    };
  }

  private async handleApprovedTransaction({
    transaction,
    receiver,
  }: TransactionData): Promise<WebhookEventData> {
    const { amount, receiver_id } = transaction;

    await this.usersRepository.updateUserBalance(
      receiver.balance + amount,
      receiver_id,
    );

    return {
      status: 'success',
      details: `Transação concluída com sucesso, valor R$ ${amount} transferido para ${receiver.name}-${receiver.user_id}`,
    };
  }

  private async logWebhookEvent(
    status: 'approved' | 'failed',
    transactionId: string,
    eventData: WebhookEventData,
  ): Promise<void> {
    await this.webhookEventsRepository.create({
      status,
      transaction_id: transactionId,
      details: JSON.stringify(eventData),
    });
  }
}
