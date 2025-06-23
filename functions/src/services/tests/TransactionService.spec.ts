import 'reflect-metadata';
import { ITransactionRepository, IUserRepository } from '../../repositories';
import { TransactionService } from '../TransactionService';
import {
  CreateTransactionDTO,
  Idempotency,
  TransactionStatus,
  User,
} from '../../schemas';
import { ApplicationError } from '../../errors';

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mocked-uuid-123'),
}));

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

describe('TransactionService', () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    jest.clearAllMocks();

    transactionService = new TransactionService(
      mockTransactionRepository,
      mockUserRepository,
    );
  });

  const mockPayer: User = {
    user_id: 'user_1',
    name: 'John Doe',
    balance: 1000,
    email: 'payer@mail',
  };

  const mockReceiver: User = {
    user_id: 'user_2',
    name: 'Jane Smith',
    balance: 500,
    email: 'receiver@mail',
  };

  const mockCreateTransactionDTO: CreateTransactionDTO = {
    payer_id: 'user_1',
    receiver_id: 'user_2',
    amount: 100,
    status: 'pending',
  };

  const mockIdempotency: Idempotency = {
    userToken: 'token_123',
    key: 'idempotency_key_123',
    status: 'active',
  };

  describe('generateIdempotencyKey', () => {
    it('should throw error when user token is not provided', async () => {
      await expect(transactionService.generateIdempotencyKey()).rejects.toThrow(
        new ApplicationError('User token não informado', 400),
      );

      expect(mockTransactionRepository.findIdempotency).not.toHaveBeenCalled();
    });

    it('should return existing active idempotency key when found', async () => {
      const userToken = 'token_123';
      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotency,
      );

      const result = await transactionService.generateIdempotencyKey(userToken);

      expect(mockTransactionRepository.findIdempotency).toHaveBeenCalledWith({
        userToken,
        status: 'active',
      });
      expect(result).toBe(mockIdempotency);
      expect(
        mockTransactionRepository.createIdempotency,
      ).not.toHaveBeenCalled();
    });

    it('should create new idempotency key when none exists', async () => {
      const userToken = 'token_123';
      const newIdempotency: Idempotency = {
        userToken,
        key: 'mocked-uuid-123',
        status: 'active',
      };

      mockTransactionRepository.findIdempotency.mockResolvedValue(null);
      mockTransactionRepository.createIdempotency.mockResolvedValue(
        newIdempotency,
      );

      const result = await transactionService.generateIdempotencyKey(userToken);

      expect(mockTransactionRepository.findIdempotency).toHaveBeenCalledWith({
        userToken,
        status: 'active',
      });
      expect(mockTransactionRepository.createIdempotency).toHaveBeenCalledWith({
        userToken,
        key: 'mocked-uuid-123',
        status: 'active',
      });
      expect(result).toBe(newIdempotency);
    });

    it('should handle empty string as user token', async () => {
      await expect(
        transactionService.generateIdempotencyKey(''),
      ).rejects.toThrow(new ApplicationError('User token não informado', 400));
    });
  });

  describe('createTransaction', () => {
    const transactionData = {
      dto: mockCreateTransactionDTO,
      idempotencyKey: 'idempotency_key_123',
      userToken: 'token_123',
    };

    it('should create transaction successfully with valid data', async () => {
      const mockTransactionResult = {
        transaction_id: 'txn_123',
        ...mockCreateTransactionDTO,
        status: 'pending' as TransactionStatus,
        created_at: new Date(),
      };

      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotency,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(mockPayer)
        .mockResolvedValueOnce(mockReceiver);
      mockTransactionRepository.createTransation.mockResolvedValue(
        mockTransactionResult,
      );

      const result =
        await transactionService.createTransaction(transactionData);

      expect(mockTransactionRepository.findIdempotency).toHaveBeenCalledWith({
        key: 'idempotency_key_123',
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_1');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_2');
      expect(mockTransactionRepository.createTransation).toHaveBeenCalledWith(
        {
          ...mockCreateTransactionDTO,
          status: 'pending',
        },
        'idempotency_key_123',
      );
      expect(result).toBe(mockTransactionResult);
    });

    it('should throw error when idempotency key is not found', async () => {
      mockTransactionRepository.findIdempotency.mockResolvedValue(null);

      await expect(
        transactionService.createTransaction(transactionData),
      ).rejects.toThrow(
        new ApplicationError('Chave de idempotencia invalida', 412),
      );

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockTransactionRepository.createTransation).not.toHaveBeenCalled();
    });

    it('should throw error when user token does not match idempotency', async () => {
      const invalidIdempotency = {
        ...mockIdempotency,
        userToken: 'different_token',
      };
      mockTransactionRepository.findIdempotency.mockResolvedValue(
        invalidIdempotency,
      );

      await expect(
        transactionService.createTransaction(transactionData),
      ).rejects.toThrow(
        new ApplicationError('Chave de idempotencia invalida', 412),
      );

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockTransactionRepository.createTransation).not.toHaveBeenCalled();
    });

    it('should throw error when idempotency key is already used', async () => {
      const usedIdempotency = {
        ...mockIdempotency,
        status: 'finished' as const,
      };
      mockTransactionRepository.findIdempotency.mockResolvedValue(
        usedIdempotency,
      );

      await expect(
        transactionService.createTransaction(transactionData),
      ).rejects.toThrow(
        new ApplicationError('Chave de idempotencia já utilizada', 409),
      );

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockTransactionRepository.createTransation).not.toHaveBeenCalled();
    });

    it('should throw error when payer is not found', async () => {
      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotency,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockReceiver);

      await expect(
        transactionService.createTransaction(transactionData),
      ).rejects.toThrow(
        new ApplicationError('Pagador ou recebedor invalidos', 404),
      );

      expect(mockTransactionRepository.createTransation).not.toHaveBeenCalled();
    });

    it('should throw error when receiver is not found', async () => {
      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotency,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(mockPayer)
        .mockResolvedValueOnce(null);

      await expect(
        transactionService.createTransaction(transactionData),
      ).rejects.toThrow(
        new ApplicationError('Pagador ou recebedor invalidos', 404),
      );

      expect(mockTransactionRepository.createTransation).not.toHaveBeenCalled();
    });

    it('should throw error when payer has insufficient balance', async () => {
      const poorPayer = { ...mockPayer, balance: 50 };

      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotency,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(poorPayer)
        .mockResolvedValueOnce(mockReceiver);

      await expect(
        transactionService.createTransaction(transactionData),
      ).rejects.toThrow(
        new ApplicationError('Saldo insuficiente para essa transação', 412),
      );

      expect(mockTransactionRepository.createTransation).not.toHaveBeenCalled();
    });

    it('should allow transaction when payer balance equals transaction amount', async () => {
      const exactBalancePayer = { ...mockPayer, balance: 100 };
      const mockTransactionResult = {
        transaction_id: 'txn_123',
        ...mockCreateTransactionDTO,
        status: 'pending' as TransactionStatus,
        created_at: new Date(),
      };

      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotency,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(exactBalancePayer)
        .mockResolvedValueOnce(mockReceiver);
      mockTransactionRepository.createTransation.mockResolvedValue(
        mockTransactionResult,
      );

      const result =
        await transactionService.createTransaction(transactionData);

      expect(mockTransactionRepository.createTransation).toHaveBeenCalledWith(
        {
          ...mockCreateTransactionDTO,
          status: 'pending',
        },
        'idempotency_key_123',
      );
      expect(result).toBe(mockTransactionResult);
    });

    it('should handle large transaction amounts correctly', async () => {
      const largeAmountDTO = { ...mockCreateTransactionDTO, amount: 50000 };
      const richPayer = { ...mockPayer, balance: 100000 };
      const transactionDataLarge = { ...transactionData, dto: largeAmountDTO };
      const mockTransactionResult = {
        transaction_id: 'txn_large',
        ...largeAmountDTO,
        status: 'pending' as TransactionStatus,
        created_at: new Date(),
      };

      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotency,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(richPayer)
        .mockResolvedValueOnce(mockReceiver);
      mockTransactionRepository.createTransation.mockResolvedValue(
        mockTransactionResult,
      );

      const result =
        await transactionService.createTransaction(transactionDataLarge);

      expect(mockTransactionRepository.createTransation).toHaveBeenCalledWith(
        {
          ...largeAmountDTO,
          status: 'pending',
        },
        'idempotency_key_123',
      );
      expect(result).toBe(mockTransactionResult);
    });
  });

  describe('findTransactionById', () => {
    const transactionId = 'txn_123';
    const mockTransaction = {
      transaction_id: transactionId,
      payer_id: 'user_1',
      receiver_id: 'user_2',
      amount: 100,
      status: 'pending' as TransactionStatus,
      created_at: new Date(),
    };

    it('should return transaction when found', async () => {
      mockTransactionRepository.findTransactionById.mockResolvedValue(
        mockTransaction,
      );

      const result =
        await transactionService.findTransactionById(transactionId);

      expect(
        mockTransactionRepository.findTransactionById,
      ).toHaveBeenCalledWith(transactionId);
      expect(result).toBe(mockTransaction);
    });

    it('should throw error when transaction is not found', async () => {
      mockTransactionRepository.findTransactionById.mockResolvedValue(null);

      await expect(
        transactionService.findTransactionById(transactionId),
      ).rejects.toThrow(new ApplicationError('Transaçaõ não encontrada', 404));
    });

    it('should handle empty transaction id', async () => {
      mockTransactionRepository.findTransactionById.mockResolvedValue(null);

      await expect(transactionService.findTransactionById('')).rejects.toThrow(
        new ApplicationError('Transaçaõ não encontrada', 404),
      );

      expect(
        mockTransactionRepository.findTransactionById,
      ).toHaveBeenCalledWith('');
    });

    it('should handle different transaction statuses', async () => {
      const approvedTransaction = {
        ...mockTransaction,
        status: 'approved' as TransactionStatus,
        created_at: new Date(),
      };
      mockTransactionRepository.findTransactionById.mockResolvedValue(
        approvedTransaction,
      );

      const result =
        await transactionService.findTransactionById(transactionId);

      expect(result).toEqual(approvedTransaction);
      expect(result.status).toBe('approved');
    });

    it('should handle failed transaction status', async () => {
      const failedTransaction = {
        ...mockTransaction,
        status: 'failed' as TransactionStatus,
        created_at: new Date(),
      };
      mockTransactionRepository.findTransactionById.mockResolvedValue(
        failedTransaction,
      );

      const result =
        await transactionService.findTransactionById(transactionId);

      expect(result).toEqual(failedTransaction);
      expect(result.status).toBe('failed');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent idempotency key generation', async () => {
      const userToken = 'token_concurrent';

      mockTransactionRepository.findIdempotency
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockIdempotency);

      mockTransactionRepository.createIdempotency.mockResolvedValue(
        mockIdempotency,
      );

      const result = await transactionService.generateIdempotencyKey(userToken);

      expect(result).toBe(mockIdempotency);
    });

    it('should validate transaction amount boundaries', async () => {
      const zeroAmountDTO = { ...mockCreateTransactionDTO, amount: 0 };
      const transactionDataZero = {
        dto: zeroAmountDTO,
        idempotencyKey: 'key_123',
        userToken: 'token_123',
      };

      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotency,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(mockPayer)
        .mockResolvedValueOnce(mockReceiver);

      const mockTransactionResult = {
        transaction_id: 'txn_zero',
        ...zeroAmountDTO,
        status: 'pending' as TransactionStatus,
        created_at: new Date(),
      };
      mockTransactionRepository.createTransation.mockResolvedValue(
        mockTransactionResult,
      );

      const result =
        await transactionService.createTransaction(transactionDataZero);

      expect(result).toBe(mockTransactionResult);
    });
  });
});
