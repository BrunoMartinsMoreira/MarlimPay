import { CreateUserDTO, UpdateUserDTO, User } from '../../schemas';

export interface IUserRepository {
  create(dto: CreateUserDTO): Promise<User>;
  update(dto: UpdateUserDTO, id: string): Promise<User>;
  find(key: 'name' | 'email', value: string): Promise<User | null>;
  findById(user_id: string): Promise<User>;
}
