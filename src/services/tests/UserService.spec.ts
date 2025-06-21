/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { ApplicationError } from '../../errors';
import { IUserRepository } from '../../repositories';
import { CreateUserDTO, User, UpdateUserDTO } from '../../schemas';
import { UserService } from '../UserService';

const mockUserRepository: jest.Mocked<IUserRepository> = {
  create: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findAllTransactionsByUserId: jest.fn(),
};

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();

    userService = new UserService(mockUserRepository);
  });

  describe('createUser', () => {
    const mockCreateUserDTO: CreateUserDTO = {
      name: 'João Silva',
      email: 'joao@email.com',
      balance: 100.5,
    };

    const mockCreatedUser: User = {
      ...mockCreateUserDTO,
      user_id: '123',
    };

    it('should create a user successfully when the email is not in use', async () => {
      mockUserRepository.find.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockCreatedUser);

      const result = await userService.createUser(mockCreateUserDTO);

      expect(mockUserRepository.find).toHaveBeenCalledWith(
        'email',
        mockCreateUserDTO.email,
      );
      expect(mockUserRepository.create).toHaveBeenCalledWith(mockCreateUserDTO);
      expect(result).toEqual(mockCreatedUser);
    });

    it('should throw an error when the email is already in use', async () => {
      const existingUser: User = {
        name: 'Outro Usuário',
        email: 'joao@email.com',
        balance: 200,
        user_id: '456',
      };
      mockUserRepository.find.mockResolvedValue(existingUser);

      await expect(userService.createUser(mockCreateUserDTO)).rejects.toThrow(
        new ApplicationError('Email não pode ser usado', 409),
      );

      expect(mockUserRepository.find).toHaveBeenCalledWith(
        'email',
        mockCreateUserDTO.email,
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    const mockUpdateUserDTO: UpdateUserDTO = {
      name: 'João Silva Atualizado',
      email: 'joao.novo@email.com',
    };

    const mockUpdatedUser: User = {
      ...mockUpdateUserDTO,
      balance: 150,
      user_id: '123',
    };

    const userId = '123';

    it('should update a user successfully when the email is not in use', async () => {
      mockUserRepository.find.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUser(mockUpdateUserDTO, userId);

      expect(mockUserRepository.find).toHaveBeenCalledWith(
        'email',
        mockUpdateUserDTO.email,
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUpdateUserDTO,
        userId,
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should update a user successfully when the email belongs to the user themselves', async () => {
      const sameUserWithEmail: User = {
        name: 'João Silva',
        email: 'joao.novo@email.com',
        balance: 100,
        user_id: '123',
      };

      mockUserRepository.find.mockResolvedValue(sameUserWithEmail);
      mockUserRepository.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUser(mockUpdateUserDTO, userId);

      expect(mockUserRepository.find).toHaveBeenCalledWith(
        'email',
        mockUpdateUserDTO.email,
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUpdateUserDTO,
        userId,
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw an error when the email is already in use by another user', async () => {
      const otherUserWithEmail: User = {
        name: 'Outro Usuário',
        email: 'joao.novo@email.com',
        balance: 200,
        user_id: '456',
      };

      mockUserRepository.find.mockResolvedValue(otherUserWithEmail);

      await expect(
        userService.updateUser(mockUpdateUserDTO, userId),
      ).rejects.toThrow(new ApplicationError('Email não pode ser usado', 409));

      expect(mockUserRepository.find).toHaveBeenCalledWith(
        'email',
        mockUpdateUserDTO.email,
      );
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('findUser', () => {
    const userId = '123';
    const mockUser: User = {
      name: 'João Silva',
      email: 'joao@email.com',
      balance: 100,
      user_id: userId,
    };

    it('should return a user when found', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.findUser(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should throw an error when the user is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null as any);

      await expect(userService.findUser(userId)).rejects.toThrow(
        new ApplicationError('Usuario não localizado!', 404),
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw an error when the returned user is undefined', async () => {
      mockUserRepository.findById.mockResolvedValue(undefined as any);

      await expect(userService.findUser(userId)).rejects.toThrow(
        new ApplicationError('Usuario não localizado!', 404),
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('Integration tests between methods', () => {
    it('should maintain data consistency between creation and retrieval', async () => {
      const createDTO: CreateUserDTO = {
        name: 'Teste Integração',
        email: 'integracao@test.com',
        balance: 250,
      };

      const createdUser: User = {
        ...createDTO,
        user_id: 'integration-123',
      };

      mockUserRepository.find.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);

      mockUserRepository.findById.mockResolvedValue(createdUser);

      const created = await userService.createUser(createDTO);
      const found = await userService.findUser(created.user_id);

      expect(created).toEqual(found);
      expect(created.email).toBe(createDTO.email);
      expect(found.name).toBe(createDTO.name);
    });
  });

  describe('Edge cases and validations', () => {
    it('should handle emails in different cases (uppercase/lowercase)', async () => {
      const createDTO: CreateUserDTO = {
        name: 'Teste Case',
        email: 'TEST@EMAIL.COM',
        balance: 100,
      };

      mockUserRepository.find.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        ...createDTO,
        user_id: 'test-case-123',
      });

      await userService.createUser(createDTO);

      expect(mockUserRepository.find).toHaveBeenCalledWith(
        'email',
        'TEST@EMAIL.COM',
      );
    });

    it('should handle zero balance on creation', async () => {
      const createDTO: CreateUserDTO = {
        name: 'Usuário Zero',
        email: 'zero@test.com',
        balance: 0.01,
      };

      const createdUser: User = {
        ...createDTO,
        user_id: 'zero-123',
      };

      mockUserRepository.find.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);

      const result = await userService.createUser(createDTO);

      expect(result.balance).toBe(0.01);
      expect(mockUserRepository.create).toHaveBeenCalledWith(createDTO);
    });
  });
});
