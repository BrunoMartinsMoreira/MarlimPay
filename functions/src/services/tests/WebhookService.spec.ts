import 'reflect-metadata';
import {
  ITransactionRepository,
  IUserRepository,
  IWebhookEventsRepository,
} from '../../repositories';
import { WebhookService } from '../WebhookService';
import {
  Transaction,
  User,
  WebhookDTO,
  TransactionStatus,
} from '../../schemas';

const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findAllTransactionsByUserId: jest.fn(),
};

const mockTransactionRepository: jest.Mocked<ITransactionRepository> = {
  createIdempotency: jest.fn(),
  findIdempotency: jest.fn(),
  createTransation: jest.fn(),
  findTransactionById: jest.fn(),
  completeTransaction: jest.fn(),
};

const mockWebhookEventsRepository: jest.Mocked<IWebhookEventsRepository> = {
  create: jest.fn(),
  findWebhookEvents: jest.fn(),
};

describe('WebhookService', () => {
  let webhookService: WebhookService;

  beforeEach(() => {
    jest.clearAllMocks();

    webhookService = new WebhookService(
      mockUserRepository,
      mockTransactionRepository,
      mockWebhookEventsRepository,
    );
  });

  const mockTransaction: Transaction = {
    transaction_id: 'txn_123',
    payer_id: 'user_1',
    receiver_id: 'user_2',
    amount: 100,
    status: 'pending' as TransactionStatus,
    created_at: new Date(),
  };

  const mockPayer: User = {
    user_id: 'user_1',
    name: 'João Silva',
    balance: 500,
    email: 'payer@mail',
  };

  const mockReceiver: User = {
    user_id: 'user_2',
    name: 'Maria Santos',
    balance: 200,
    email: 'receiver@mail',
  };

  const mockWebhookDTO: WebhookDTO = {
    status: 'approved',
    transaction_id: 'txn_123',
  };

  describe('updateTransaction', () => {
    it('should successfully process an approved transaction', async () => {
      mockTransactionRepository.findTransactionById.mockResolvedValue(
        mockTransaction,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(mockPayer)
        .mockResolvedValueOnce(mockReceiver);
      mockTransactionRepository.completeTransaction.mockResolvedValue(
        undefined,
      );
      mockWebhookEventsRepository.create.mockResolvedValue(undefined);

      await webhookService.updateTransaction(mockWebhookDTO);

      expect(
        mockTransactionRepository.findTransactionById,
      ).toHaveBeenCalledWith('txn_123');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_1');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_2');
      expect(
        mockTransactionRepository.completeTransaction,
      ).toHaveBeenCalledWith({
        balance: 300,
        user_id: 'user_2',
        status: 'approved',
        transaction_id: 'txn_123',
      });
      expect(mockWebhookEventsRepository.create).toHaveBeenCalledWith({
        status: 'approved',
        transaction_id: 'txn_123',
        details: JSON.stringify({
          status: 'success',
          details:
            'Transação concluída com sucesso, valor R$ 100 transferido para Maria Santos-user_2',
        }),
      });
    });

    it('should successfully process an failed transaction', async () => {
      const failedWebhookDTO: WebhookDTO = {
        status: 'failed',
        transaction_id: 'txn_123',
      };

      mockTransactionRepository.findTransactionById.mockResolvedValue(
        mockTransaction,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(mockPayer)
        .mockResolvedValueOnce(mockReceiver);
      mockTransactionRepository.completeTransaction.mockResolvedValue(
        undefined,
      );
      mockWebhookEventsRepository.create.mockResolvedValue(undefined);

      await webhookService.updateTransaction(failedWebhookDTO);

      expect(
        mockTransactionRepository.completeTransaction,
      ).toHaveBeenCalledWith({
        balance: 600,
        user_id: 'user_1',
        status: 'failed',
        transaction_id: 'txn_123',
      });
      expect(mockWebhookEventsRepository.create).toHaveBeenCalledWith({
        status: 'failed',
        transaction_id: 'txn_123',
        details: JSON.stringify({
          status: 'error',
          details:
            'Transação falhou! Valor 100 devolvido ao pagador user_1 - João Silva',
        }),
      });
    });

    it('should log an error when the transaction is not found', async () => {
      mockTransactionRepository.findTransactionById.mockResolvedValue(null);
      mockWebhookEventsRepository.create.mockResolvedValue(undefined);

      await webhookService.updateTransaction(mockWebhookDTO);

      expect(
        mockTransactionRepository.findTransactionById,
      ).toHaveBeenCalledWith('txn_123');
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(
        mockTransactionRepository.completeTransaction,
      ).not.toHaveBeenCalled();
      expect(mockWebhookEventsRepository.create).toHaveBeenCalledWith({
        status: 'approved',
        transaction_id: 'txn_123',
        details: JSON.stringify({
          status: 'error',
          details: 'Não foi encontrada transação para o id informado',
        }),
      });
    });

    it('should ignore a transaction that is not in pending status', async () => {
      const processedTransaction = {
        ...mockTransaction,
        status: 'approved' as TransactionStatus,
      };
      mockTransactionRepository.findTransactionById.mockResolvedValue(
        processedTransaction,
      );

      await webhookService.updateTransaction(mockWebhookDTO);

      expect(
        mockTransactionRepository.findTransactionById,
      ).toHaveBeenCalledWith('txn_123');
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(
        mockTransactionRepository.completeTransaction,
      ).not.toHaveBeenCalled();
      expect(mockWebhookEventsRepository.create).not.toHaveBeenCalled();
    });

    it('hould ignore when it cannot retrieve user data', async () => {
      mockTransactionRepository.findTransactionById.mockResolvedValue(
        mockTransaction,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockReceiver);

      await webhookService.updateTransaction(mockWebhookDTO);

      expect(
        mockTransactionRepository.findTransactionById,
      ).toHaveBeenCalledWith('txn_123');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_1');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_2');
      expect(
        mockTransactionRepository.completeTransaction,
      ).not.toHaveBeenCalled();
      expect(mockWebhookEventsRepository.create).not.toHaveBeenCalled();
    });

    it('should ignore when the status does not have a corresponding handler', async () => {
      const unknownStatusWebhook: WebhookDTO = {
        status: 'unknown' as any,
        transaction_id: 'txn_123',
      };

      mockTransactionRepository.findTransactionById.mockResolvedValue(
        mockTransaction,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(mockPayer)
        .mockResolvedValueOnce(mockReceiver);

      await webhookService.updateTransaction(unknownStatusWebhook);

      expect(
        mockTransactionRepository.findTransactionById,
      ).toHaveBeenCalledWith('txn_123');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_1');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_2');
      expect(
        mockTransactionRepository.completeTransaction,
      ).not.toHaveBeenCalled();
      expect(mockWebhookEventsRepository.create).not.toHaveBeenCalled();
    });

    it('should log an error when an exception occurs during processing', async () => {
      const error = new Error('Database connection failed');
      mockTransactionRepository.findTransactionById.mockRejectedValue(error);
      mockWebhookEventsRepository.create.mockResolvedValue(undefined);

      await webhookService.updateTransaction(mockWebhookDTO);

      expect(mockWebhookEventsRepository.create).toHaveBeenCalledWith({
        status: 'approved',
        transaction_id: 'txn_123',
        details: JSON.stringify({
          status: 'error',
          details: JSON.stringify(error),
        }),
      });
    });

    it('should process a failed transaction when the payer is not found', async () => {
      mockTransactionRepository.findTransactionById.mockResolvedValue(
        mockTransaction,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(mockPayer)
        .mockResolvedValueOnce(null);

      await webhookService.updateTransaction(mockWebhookDTO);

      expect(
        mockTransactionRepository.findTransactionById,
      ).toHaveBeenCalledWith('txn_123');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_1');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_2');
      expect(
        mockTransactionRepository.completeTransaction,
      ).not.toHaveBeenCalled();
      expect(mockWebhookEventsRepository.create).not.toHaveBeenCalled();
    });

    it('should process multiple transactions with different statuses', async () => {
      const approvedWebhook: WebhookDTO = {
        status: 'approved',
        transaction_id: 'txn_123',
      };
      const failedWebhook: WebhookDTO = {
        status: 'failed',
        transaction_id: 'txn_456',
      };

      mockTransactionRepository.findTransactionById
        .mockResolvedValueOnce(mockTransaction)
        .mockResolvedValueOnce({
          ...mockTransaction,
          transaction_id: 'txn_456',
        });

      mockUserRepository.findById
        .mockResolvedValue(mockPayer)
        .mockResolvedValue(mockReceiver);

      mockTransactionRepository.completeTransaction.mockResolvedValue(
        undefined,
      );
      mockWebhookEventsRepository.create.mockResolvedValue(undefined);

      await webhookService.updateTransaction(approvedWebhook);
      await webhookService.updateTransaction(failedWebhook);

      expect(
        mockTransactionRepository.completeTransaction,
      ).toHaveBeenCalledTimes(2);
      expect(mockWebhookEventsRepository.create).toHaveBeenCalledTimes(2);

      expect(
        mockTransactionRepository.completeTransaction,
      ).toHaveBeenNthCalledWith(1, {
        balance: 300,
        user_id: 'user_2',
        status: 'approved',
        transaction_id: 'txn_123',
      });

      expect(
        mockTransactionRepository.completeTransaction,
      ).toHaveBeenNthCalledWith(2, {
        balance: 300,
        user_id: 'user_1',
        status: 'failed',
        transaction_id: 'txn_456',
      });
    });

    it('should keep balances correct after multiple operations', async () => {
      const highAmountTransaction = { ...mockTransaction, amount: 1000 };
      mockTransactionRepository.findTransactionById.mockResolvedValue(
        highAmountTransaction,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(mockPayer)
        .mockResolvedValueOnce(mockReceiver);
      mockTransactionRepository.completeTransaction.mockResolvedValue(
        undefined,
      );
      mockWebhookEventsRepository.create.mockResolvedValue(undefined);

      await webhookService.updateTransaction(mockWebhookDTO);

      expect(
        mockTransactionRepository.completeTransaction,
      ).toHaveBeenCalledWith({
        balance: 1200,
        user_id: 'user_2',
        status: 'approved',
        transaction_id: 'txn_123',
      });
    });
  });
});
