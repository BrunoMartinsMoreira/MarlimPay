import { CreateUserDTO, UpdateUserDTO, User } from '../schemas';
import { ApplicationError } from '../errors';
import { inject, injectable } from 'tsyringe';
import { IUserRepository } from '../repositories';

@injectable()
export class UserService {
  constructor(
    @inject('UserRepository')
    private readonly usersRepository: IUserRepository,
  ) {}

  async createUser(data: CreateUserDTO): Promise<User> {
    const emailIsAlreadyInUse = await this.usersRepository.find(
      'email',
      data.email,
    );

    if (emailIsAlreadyInUse) {
      throw new ApplicationError('Email não pode ser usado', 409);
    }

    const user = await this.usersRepository.create(data);
    return user;
  }

  async updateUser(data: UpdateUserDTO, id: string): Promise<User> {
    const userEmail = await this.usersRepository.find('email', data.email);
    if (userEmail && userEmail?.user_id !== id) {
      throw new ApplicationError('Email não pode ser usado', 409);
    }

    const updatedUser = await this.usersRepository.update(data, id);
    return updatedUser;
  }

  async findUser(id: string): Promise<User> {
    const user: User = await this.usersRepository.findById(id);

    if (!user) {
      throw new ApplicationError('Usuario não localizado!', 404);
    }

    return user;
  }
}
