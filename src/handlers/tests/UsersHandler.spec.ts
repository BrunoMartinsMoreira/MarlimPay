/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import request from 'supertest';
import express from 'express';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { IUserRepository } from '../../repositories';
import { UsersHandler } from '../UsersHandler';
import { ApplicationError } from '../../errors';
import { CreateUserDTO, User, UpdateUserDTO } from '../../schemas';
import { UserService } from '../../services';

const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
};

const createTestApp = () => {
  const app = express();
  app.use(express.json());

  container.registerInstance('UserRepository', mockUserRepository);

  const usersHandler = container.resolve(UsersHandler);

  app.post('/users', (req, res) => usersHandler.createUser(req, res));
  app.put('/users/:user_id', (req, res) => usersHandler.updateUser(req, res));
  app.get('/users/:user_id', (req, res) => usersHandler.getUser(req, res));

  return app;
};

describe('UserHandler testes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();
    app = createTestApp();
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe('POST /users - Create User', () => {
    const validUserData: CreateUserDTO = {
      name: 'João Silva',
      email: 'joao@example.com',
      balance: 1000,
    };

    const mockCreatedUser: User = {
      ...validUserData,
      user_id: 'user-123',
    };

    it('should create a user successfully', async () => {
      mockUserRepository.find.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);

      const response = await request(app).post('/users').send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockCreatedUser);
      expect(mockUserRepository.find).toHaveBeenCalledWith(
        'email',
        validUserData.email,
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith(validUserData);
    });

    it('should return 409 when email is already in use', async () => {
      mockUserRepository.find.mockResolvedValue(mockCreatedUser);

      const response = await request(app).post('/users').send(validUserData);

      expect(response.status).toBe(409);
      expect(mockUserRepository.find).toHaveBeenCalledWith(
        'email',
        validUserData.email,
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should return 500 for invalid request body - missing name', async () => {
      const response = await request(app).post('/users').send({
        email: 'joao@example.com',
        balance: 1000,
      });

      expect(response.status).toBe(500);
      expect(mockUserRepository.find).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should return 500 for invalid email format', async () => {
      const response = await request(app).post('/users').send({
        name: 'João Silva',
        email: 'invalid-email',
        balance: 1000,
      });

      expect(response.status).toBe(500);
      expect(mockUserRepository.find).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should return 500 for negative balance', async () => {
      const response = await request(app).post('/users').send({
        name: 'João Silva',
        email: 'joao@example.com',
        balance: -100,
      });

      expect(response.status).toBe(500);
      expect(mockUserRepository.find).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /users/:user_id - Update User', () => {
    const userId = 'user-123';
    const validUpdateData: UpdateUserDTO = {
      name: 'João Silva Atualizado',
      email: 'joao.novo@example.com',
    };

    const mockUpdatedUser: User = {
      ...validUpdateData,
      balance: 1000,
      user_id: userId,
    };

    it('should update user successfully', async () => {
      mockUserRepository.find.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .put(`/users/${userId}`)
        .send(validUpdateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdatedUser);
      expect(mockUserRepository.find).toHaveBeenCalledWith(
        'email',
        validUpdateData.email,
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        validUpdateData,
        userId,
      );
    });

    it('should update user with same email successfully', async () => {
      const existingUser: User = {
        name: 'João Silva',
        email: validUpdateData.email,
        balance: 1000,
        user_id: userId,
      };
      mockUserRepository.find.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .put(`/users/${userId}`)
        .send(validUpdateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdatedUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        validUpdateData,
        userId,
      );
    });

    it('should return 409 when email is already in use by another user', async () => {
      const anotherUser: User = {
        name: 'Outro Usuário',
        email: validUpdateData.email,
        balance: 500,
        user_id: 'another-user-id',
      };
      mockUserRepository.find.mockResolvedValue(anotherUser);

      const response = await request(app)
        .put(`/users/${userId}`)
        .send(validUpdateData);

      expect(response.status).toBe(409);
      expect(mockUserRepository.find).toHaveBeenCalledWith(
        'email',
        validUpdateData.email,
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid user_id parameter', async () => {
      const response = await request(app).put('/users/').send(validUpdateData);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app).put(`/users/${userId}`).send({
        name: 'João Silva',
        email: 'invalid-email',
      });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /users/:user_id - Get User', () => {
    const userId = 'user-123';
    const mockUser: User = {
      name: 'João Silva',
      email: 'joao@example.com',
      balance: 1000,
      user_id: userId,
    };

    it('should get user successfully', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const response = await request(app).get(`/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should return 404 when user is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null as any);

      const response = await request(app).get(`/users/${userId}`);

      expect(response.status).toBe(404);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should return 400 for invalid user_id parameter', async () => {
      const response = await request(app).get('/users/');

      expect(response.status).toBe(404);
    });

    it('should handle repository errors', async () => {
      mockUserRepository.findById.mockRejectedValue(
        new Error('Database error'),
      );

      const response = await request(app).get(`/users/${userId}`);

      expect(response.status).toBe(500);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('Service Integration Tests', () => {
    let userService: UserService;

    beforeEach(() => {
      container.registerInstance('UserRepository', mockUserRepository);
      userService = container.resolve(UserService);
    });

    describe('createUser', () => {
      it('should create user when email is not in use', async () => {
        const userData: CreateUserDTO = {
          name: 'João Silva',
          email: 'joao@example.com',
          balance: 1000,
        };
        const mockUser: User = { ...userData, user_id: 'user-123' };

        mockUserRepository.find.mockResolvedValue(null);
        mockUserRepository.create.mockResolvedValue(mockUser);

        const result = await userService.createUser(userData);

        expect(result).toEqual(mockUser);
        expect(mockUserRepository.find).toHaveBeenCalledWith(
          'email',
          userData.email,
        );
        expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
      });

      it('should throw ApplicationError when email is already in use', async () => {
        const userData: CreateUserDTO = {
          name: 'João Silva',
          email: 'joao@example.com',
          balance: 1000,
        };
        const existingUser: User = { ...userData, user_id: 'existing-user' };

        mockUserRepository.find.mockResolvedValue(existingUser);

        await expect(userService.createUser(userData)).rejects.toThrow(
          ApplicationError,
        );

        expect(mockUserRepository.create).not.toHaveBeenCalled();
      });
    });

    describe('updateUser', () => {
      it('should update user when email is not in use', async () => {
        const updateData: UpdateUserDTO = {
          name: 'João Atualizado',
          email: 'joao.novo@example.com',
        };
        const userId = 'user-123';
        const updatedUser: User = {
          ...updateData,
          balance: 1000,
          user_id: userId,
        };

        mockUserRepository.find.mockResolvedValue(null);
        mockUserRepository.update.mockResolvedValue(updatedUser);

        const result = await userService.updateUser(updateData, userId);

        expect(result).toEqual(updatedUser);
        expect(mockUserRepository.update).toHaveBeenCalledWith(
          updateData,
          userId,
        );
      });

      it('should throw ApplicationError when email is in use by another user', async () => {
        const updateData: UpdateUserDTO = {
          name: 'João Atualizado',
          email: 'joao.novo@example.com',
        };
        const userId = 'user-123';
        const anotherUser: User = {
          name: 'Outro Usuário',
          email: updateData.email,
          balance: 500,
          user_id: 'another-user',
        };

        mockUserRepository.find.mockResolvedValue(anotherUser);

        await expect(
          userService.updateUser(updateData, userId),
        ).rejects.toThrow(ApplicationError);

        expect(mockUserRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('findUser', () => {
      it('should return user when found', async () => {
        const userId = 'user-123';
        const mockUser: User = {
          name: 'João Silva',
          email: 'joao@example.com',
          balance: 1000,
          user_id: userId,
        };

        mockUserRepository.findById.mockResolvedValue(mockUser);

        const result = await userService.findUser(userId);

        expect(result).toEqual(mockUser);
        expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      });

      it('should throw ApplicationError when user is not found', async () => {
        const userId = 'non-existent-user';
        mockUserRepository.findById.mockResolvedValue(null as any);

        await expect(userService.findUser(userId)).rejects.toThrow(
          ApplicationError,
        );
      });
    });
  });
});
