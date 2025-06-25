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

interface WebhookEventLogs {
  status: string;
  details: string;
}

interface GetUsersData {
  payer: User;
  receiver: User;
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

      const users = await this.getUsersData(
        transaction.payer_id,
        transaction.receiver_id,
      );
      if (!users) return;

      const handler = this.statusHandlers[status];
      if (!handler) return;

      const eventLogs = await handler({
        transaction,
        payer: users.payer,
        receiver: users.receiver,
      });
      await this.logWebhookEvent(status, transaction_id, eventLogs);
    } catch (error) {
      await this.logWebhookEvent(status, transaction_id, {
        status: 'error',
        details: JSON.stringify(error),
      });
    }
  }

  private async getUsersData(
    payer_id: string,
    receiver_id: string,
  ): Promise<GetUsersData | null> {
    const [payer, receiver] = await Promise.all([
      this.usersRepository.findById(payer_id),
      this.usersRepository.findById(receiver_id),
    ]);

    if (!payer || !receiver) return null;

    return { payer, receiver };
  }

  private async handleFailedTransaction({
    transaction,
    payer,
  }: TransactionData): Promise<WebhookEventLogs> {
    const { amount, payer_id, transaction_id } = transaction;
    await this.transactionsRepository.completeTransaction({
      balance: payer.balance + amount,
      user_id: payer_id,
      status: 'failed',
      transaction_id,
    });

    return {
      status: 'error',
      details: `Transação falhou! Valor ${amount} devolvido ao pagador ${payer_id} - ${payer.name}`,
    };
  }

  private async handleApprovedTransaction({
    transaction,
    receiver,
  }: TransactionData): Promise<WebhookEventLogs> {
    const { amount, receiver_id, transaction_id } = transaction;

    await this.transactionsRepository.completeTransaction({
      balance: receiver.balance + amount,
      user_id: receiver_id,
      status: 'approved',
      transaction_id,
    });

    return {
      status: 'success',
      details: `Transação concluída com sucesso, valor R$ ${amount} transferido para ${receiver.name}-${receiver.user_id}`,
    };
  }

  private async logWebhookEvent(
    status: 'approved' | 'failed',
    transactionId: string,
    eventData: WebhookEventLogs,
  ): Promise<void> {
    await this.webhookEventsRepository.create({
      status,
      transaction_id: transactionId,
      details: JSON.stringify(eventData),
    });
  }
}
