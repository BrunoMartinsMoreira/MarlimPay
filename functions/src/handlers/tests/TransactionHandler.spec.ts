import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';
import { ITransactionRepository, IUserRepository } from '../../repositories';
import { TOKENS } from '../../server/DISetup';
import { TransactionHandler } from '../TransactionsHandler';

const mockTransactionRepository: jest.Mocked<ITransactionRepository> = {
  createIdempotency: jest.fn(),
  findIdempotency: jest.fn(),
  createTransation: jest.fn(),
  findTransactionById: jest.fn(),
  updateTransactionStatus: jest.fn(),
};

const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findAllTransactionsByUserId: jest.fn(),
  updateUserBalance: jest.fn(),
};

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req: any, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      req.userToken = authHeader.replace('Bearer ', '');
    }
    next();
  });

  container.registerInstance(
    TOKENS.TransactionRepository,
    mockTransactionRepository,
  );
  container.registerInstance(TOKENS.UserRepository, mockUserRepository);

  const handler = container.resolve(TransactionHandler);

  app.post('/transactions/idempotency/generate', (req, res) =>
    handler.generateIdempotencyKey(req, res),
  );
  app.post('/transactions', (req, res) => handler.createTransaction(req, res));

  app.get('transactions/:transaction_id', (req, res) =>
    handler.findTransactionById(req, res),
  );

  return app;
};

describe('TransactionHandler Integration Tests', () => {
  let app: express.Application;
  beforeAll(() => {
    container.registerInstance(
      TOKENS.TransactionRepository,
      mockTransactionRepository,
    );
    container.registerInstance(
      TOKENS.TransactionRepository,
      mockTransactionRepository,
    );
    container.registerInstance(TOKENS.UserRepository, mockUserRepository);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();
    app = createTestApp();
  });

  afterAll(() => {
    container.clearInstances();
  });

  describe('POST /transactions/idempotency/generate', () => {
    const validUserToken = 'user_token_01';

    it('should generate a new idempotency key when there is no active one', async () => {
      const mockIdempotencyData = {
        userToken: validUserToken,
        key: 'generated-uuid-123',
        status: 'active' as const,
      };

      mockTransactionRepository.findIdempotency.mockResolvedValue(null);
      mockTransactionRepository.createIdempotency.mockResolvedValue(
        mockIdempotencyData,
      );

      const response = await request(app)
        .post('/transactions/idempotency/generate')
        .set('Authorization', `Bearer ${validUserToken}`)
        .expect(201);

      expect(response.body).toEqual(mockIdempotencyData);
      expect(mockTransactionRepository.findIdempotency).toHaveBeenCalledWith({
        userToken: validUserToken,
        status: 'active',
      });
      expect(mockTransactionRepository.createIdempotency).toHaveBeenCalledWith(
        expect.objectContaining({
          userToken: validUserToken,
          status: 'active',
          key: expect.any(String),
        }),
      );
    });

    it('should return the existing idempotency key when there is already an active one', async () => {
      const existingIdempotencyData = {
        userToken: validUserToken,
        key: 'existing-uuid-456',
        status: 'active' as const,
      };

      mockTransactionRepository.findIdempotency.mockResolvedValue(
        existingIdempotencyData,
      );

      const response = await request(app)
        .post('/transactions/idempotency/generate')
        .set('Authorization', `Bearer ${validUserToken}`)
        .expect(201);

      expect(response.body).toEqual(existingIdempotencyData);
      expect(
        mockTransactionRepository.createIdempotency,
      ).not.toHaveBeenCalled();
    });

    it('should return 400 error when userToken is not provided', async () => {
      await request(app).post('/transactions/idempotency/generate').expect(400);
    });
  });

  describe('POST /transactions', () => {
    const validUserToken = 'valid-user-token-123';
    const validIdempotencyKey = 'valid-idempotency-key-789';
    const validTransactionData = {
      payer_id: 'payer-123',
      receiver_id: 'receiver-456',
      amount: 100,
    };

    const mockPayer = {
      user_id: 'payer-123',
      name: 'João Silva',
      email: 'joao@example.com',
      balance: 500,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockReceiver = {
      user_id: 'receiver-456',
      name: 'Maria Santos',
      email: 'maria@example.com',
      balance: 300,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockIdempotencyData = {
      userToken: validUserToken,
      key: validIdempotencyKey,
      status: 'active' as const,
    };

    const mockTransactionResult = {
      transaction_id: 'transaction-789',
      status: 'pendig' as const,
      created_at: new Date(),
    };

    it('should create a transaction successfully', async () => {
      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotencyData,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(mockPayer)
        .mockResolvedValueOnce(mockReceiver);
      mockTransactionRepository.createTransation.mockResolvedValue(
        mockTransactionResult,
      );

      await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${validUserToken}`)
        .set('Idempotency-Key', validIdempotencyKey)
        .send(validTransactionData)
        .expect(201);

      expect(mockTransactionRepository.findIdempotency).toHaveBeenCalledWith({
        key: validIdempotencyKey,
      });
      expect(mockUserRepository.findById).toHaveBeenCalledWith('payer-123');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('receiver-456');
      expect(mockTransactionRepository.createTransation).toHaveBeenCalledWith(
        {
          ...validTransactionData,
          status: 'pendig',
        },
        validIdempotencyKey,
      );
    });

    it('should return 412 error when the idempotency key is invalid', async () => {
      mockTransactionRepository.findIdempotency.mockResolvedValue(null);

      await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${validUserToken}`)
        .set('Idempotency-Key', 'invalid-key')
        .send(validTransactionData)
        .expect(412);
    });

    it('should return 409 error when the idempotency key has already been used', async () => {
      const usedIdempotencyData = {
        ...mockIdempotencyData,
        status: 'finished' as const,
      };

      mockTransactionRepository.findIdempotency.mockResolvedValue(
        usedIdempotencyData,
      );

      await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${validUserToken}`)
        .set('Idempotency-Key', validIdempotencyKey)
        .send(validTransactionData)
        .expect(409);
    });

    it('should return 404 error when the payer does not exist', async () => {
      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotencyData,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce(mockReceiver);

      await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${validUserToken}`)
        .set('Idempotency-Key', validIdempotencyKey)
        .send(validTransactionData)
        .expect(404);
    });

    it('should return 404 error when the receiver does not exist', async () => {
      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotencyData,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(mockPayer)
        .mockResolvedValueOnce(null as any);

      await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${validUserToken}`)
        .set('Idempotency-Key', validIdempotencyKey)
        .send(validTransactionData)
        .expect(404);
    });

    it('should return 412 error when the payer has insufficient balance', async () => {
      const payerWithLowBalance = {
        ...mockPayer,
        balance: 50, // Menor que o amount (100)
      };

      mockTransactionRepository.findIdempotency.mockResolvedValue(
        mockIdempotencyData,
      );
      mockUserRepository.findById
        .mockResolvedValueOnce(payerWithLowBalance)
        .mockResolvedValueOnce(mockReceiver);

      await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${validUserToken}`)
        .set('Idempotency-Key', validIdempotencyKey)
        .send(validTransactionData)
        .expect(412);
    });
  });
});
