import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';

import { Transaction, User, WebhookDTO } from '../../schemas';
import {
  IUserRepository,
  ITransactionRepository,
  IWebhookEventsRepository,
} from '../../repositories';
import { TOKENS } from '../../server/DISetup';
import { WebhookHandler } from '../WebhookHandler';

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

const createTestApp = () => {
  const app = express();
  app.use(express.json());

  container.registerInstance(TOKENS.UserRepository, mockUserRepository);
  container.registerInstance(
    TOKENS.TransactionRepository,
    mockTransactionRepository,
  );
  container.registerInstance(
    TOKENS.WebhookEventsRepository,
    mockWebhookEventsRepository,
  );

  const handler = container.resolve(WebhookHandler);

  app.post('/webhook/payment-gateway', (req, res) =>
    handler.updatePayment(req, res),
  );

  return app;
};

describe('WebhookHandler', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();
    app = createTestApp();
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('POST /webhook/payment-gateway', () => {
    const payer: User = {
      balance: 2000,
      email: 'payer@mail.com',
      name: 'payer',
      user_id: '#1',
    };

    const receiver: User = {
      balance: 2000,
      email: 'receiver@mail.com',
      name: 'receiver',
      user_id: '#2',
    };

    const validTransaction: Transaction = {
      amount: 200,
      created_at: new Date(),
      payer_id: '#1',
      receiver_id: '#2',
      status: 'pending',
      transaction_id: '#tr1',
    };

    it('Should return if transaction is not found', async () => {
      const dto: WebhookDTO = {
        status: 'approved',
        transaction_id: '123',
      };

      mockTransactionRepository.findTransactionById.mockResolvedValue(null);
      const response = await request(app)
        .post('/webhook/payment-gateway')
        .send(dto);

      expect(response.status).toBe(200);
      expect(
        mockTransactionRepository.findTransactionById,
      ).toHaveBeenCalledWith(dto.transaction_id);
      expect(mockWebhookEventsRepository.create).toHaveBeenCalledWith({
        status: dto.status,
        transaction_id: dto.transaction_id,
        details: JSON.stringify({
          status: 'error',
          details: 'Não foi encontrada transação para o id informado',
        }),
      });
    });

    it('should return if transaction status is diffent pending', async () => {
      mockTransactionRepository.findTransactionById.mockResolvedValue({
        ...validTransaction,
        status: 'approved',
      });

      const dto: WebhookDTO = {
        status: 'approved',
        transaction_id: validTransaction.transaction_id,
      };

      const response = await request(app)
        .post('/webhook/payment-gateway')
        .send(dto);

      expect(response.status).toBe(200);
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(0);
    });

    it('Should handle with approved transaction', async () => {
      mockTransactionRepository.findTransactionById.mockResolvedValue(
        validTransaction,
      );
      mockUserRepository.findById.mockResolvedValue(payer);
      mockUserRepository.findById.mockResolvedValue(receiver);

      const dto: WebhookDTO = {
        status: 'approved',
        transaction_id: validTransaction.transaction_id,
      };

      const response = await request(app)
        .post('/webhook/payment-gateway')
        .send(dto);

      expect(response.status).toBe(200);
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(payer.user_id);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        receiver.user_id,
      );
      expect(
        mockTransactionRepository.completeTransaction,
      ).toHaveBeenCalledWith({
        status: dto.status,
        user_id: receiver.user_id,
        transaction_id: validTransaction.transaction_id,
        balance: receiver.balance + validTransaction.amount,
      });
      expect(mockWebhookEventsRepository.create).toHaveBeenCalledWith({
        status: dto.status,
        transaction_id: dto.transaction_id,
        details: JSON.stringify({
          status: 'success',
          details: `Transação concluída com sucesso, valor R$ ${validTransaction.amount} transferido para ${receiver.name}-${receiver.user_id}`,
        }),
      });
    });
  });
});
