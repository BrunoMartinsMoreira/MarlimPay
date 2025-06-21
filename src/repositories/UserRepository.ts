import { injectable, singleton } from 'tsyringe';
import { getFirestore } from 'firebase-admin/firestore';
import { CreateUserDTO, User, UpdateUserDTO } from '../schemas';
import { IUserRepository } from './Contracts/IUserRepository';

@injectable()
@singleton()
export class UserRepository implements IUserRepository {
  private readonly db = getFirestore();

  async create(dto: CreateUserDTO): Promise<User> {
    const user = await (await this.db.collection('users').add(dto)).get();
    const userData = user.data();

    return {
      user_id: user.id,
      ...userData,
    } as User;
  }

  async update(dto: UpdateUserDTO, id: string): Promise<User> {
    await this.db.collection('users').doc(id).update(dto);
    const updatedUser = await this.findById(id);

    return updatedUser;
  }

  async find(key: 'name' | 'email', value: string): Promise<User | null> {
    const snapshot = await this.db
      .collection('users')
      .where(key, '==', value)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { user_id: doc.id, ...doc.data() } as User;
  }

  async findById(user_id: string): Promise<User> {
    const doc = await this.db.collection('users').doc(user_id).get();

    return {
      user_id: doc.id,
      ...doc.data(),
    } as User;
  }
}
