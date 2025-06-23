/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-unused-vars */

import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { container } from 'tsyringe';
import { IUserRepository } from '../../repositories';
import { UsersHandler } from '../UsersHandler';
import { ApplicationError } from '../../errors';
import { TOKENS } from '../../server/DISetup';

const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findAllTransactionsByUserId: jest.fn(),
};

const errorHandler = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (err instanceof ApplicationError) {
    return res.status(err.status).json({
      error: err.message,
      status: err.status,
    });
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors,
    });
  }

  return res.status(500).json({
    error: 'Internal Server Error',
  });
};

const createTestApp = () => {
  const app = express();
  app.use(express.json());

  container.registerInstance(TOKENS.UserRepository, mockUserRepository);

  const usersHandler = container.resolve(UsersHandler);

  const asyncHandler =
    (fn: Function) =>
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  app.post(
    '/users',
    asyncHandler((req: express.Request, res: express.Response) =>
      usersHandler.createUser(req, res),
    ),
  );
  app.put(
    '/users/:user_id',
    asyncHandler((req: express.Request, res: express.Response) =>
      usersHandler.updateUser(req, res),
    ),
  );
  app.get(
    '/users/:user_id',
    asyncHandler((req: express.Request, res: express.Response) =>
      usersHandler.getUser(req, res),
    ),
  );

  app.use(errorHandler as unknown as express.ErrorRequestHandler);

  return app;
};

describe('Users Error Handling  Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();
    app = createTestApp();
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('POST /users - Error Handling', () => {
    it('should return 409 when email is already in use', async () => {
      mockUserRepository.find.mockResolvedValue({
        user_id: 'existing-user',
        name: 'Existing User',
        email: 'existing@example.com',
        balance: 1000,
      });

      const response = await request(app).post('/users').send({
        name: 'New User',
        email: 'existing@example.com',
        balance: 500,
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: 'Email não pode ser usado',
        status: 409,
      });
    });

    it('should return 400 for validation errors', async () => {
      const response = await request(app).post('/users').send({
        name: '',
        email: 'invalid-email',
        balance: -100,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app).post('/users').send({
        name: 'João Silva',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should handle database errors', async () => {
      mockUserRepository.find.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const response = await request(app).post('/users').send({
        name: 'João Silva',
        email: 'joao@example.com',
        balance: 1000,
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal Server Error');
    });
  });

  describe('PUT /users/:user_id - Error Handling', () => {
    it('should return 409 when email is already in use by another user', async () => {
      mockUserRepository.find.mockResolvedValue({
        user_id: 'another-user',
        name: 'Another User',
        email: 'another@example.com',
        balance: 1000,
      });

      const response = await request(app).put('/users/user-123').send({
        name: 'Updated Name',
        email: 'another@example.com',
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: 'Email não pode ser usado',
        status: 409,
      });
    });

    it('should return 400 for invalid user_id', async () => {
      const response = await request(app).put('/users/').send({
        name: 'Updated Name',
        email: 'updated@example.com',
      });

      expect(response.status).toBe(404);
    });

    it('should return 400 for validation errors', async () => {
      const response = await request(app).put('/users/user-123').send({
        name: '',
        email: 'invalid-email',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /users/:user_id - Error Handling', () => {
    it('should return 404 when user is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null as any);

      const response = await request(app).get('/users/non-existent-user');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Usuario não localizado!',
        status: 404,
      });
    });

    it('should return 400 for invalid user_id parameter', async () => {
      const response = await request(app).get('/users/');

      expect(response.status).toBe(404);
    });

    it('should handle database errors', async () => {
      mockUserRepository.findById.mockRejectedValue(
        new Error('Database error'),
      );

      const response = await request(app).get('/users/user-123');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal Server Error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/users')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(500);
    });

    it('should handle very large request bodies', async () => {
      const largeString = 'a'.repeat(10000);

      const response = await request(app).post('/users').send({
        name: largeString,
        email: 'test@example.com',
        balance: 1000,
      });

      expect(response.status).toBe(409);
    });

    it('should handle concurrent requests', async () => {
      mockUserRepository.find.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        user_id: 'user-123',
        name: 'João Silva',
        email: 'joao@example.com',
        balance: 1000,
      });

      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/users')
          .send({
            name: `User ${i}`,
            email: `user${i}@example.com`,
            balance: 1000,
          }),
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect([201, 409]).toContain(response.status);
      });
    });
  });
});
