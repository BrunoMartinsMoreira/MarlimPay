import {
  CreateUserDTO,
  ListTransactionItem,
  UpdateUserDTO,
  User,
} from '../../schemas';

export interface IUserRepository {
  create(dto: CreateUserDTO): Promise<User>;
  update(dto: UpdateUserDTO, id: string): Promise<User | null>;
  find(key: 'name' | 'email', value: string): Promise<User | null>;
  findById(user_id: string): Promise<User | null>;
  findAllTransactionsByUserId(user_id: string): Promise<ListTransactionItem[]>;
  updateUserAmount(amount: number, user_id: string): Promise<void>;
}
