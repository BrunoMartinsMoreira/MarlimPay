import { container } from 'tsyringe';
import { IUserRepository, UserRepository } from '../repositories';

export function DISetup() {
  container.register<IUserRepository>('UserRepository', UserRepository);
}
