import { injectable } from 'tsyringe';
import { getFirestore } from 'firebase-admin/firestore';
import {
  CreateUserDTO,
  User,
  UpdateUserDTO,
  ListTransactionItem,
  Transaction,
} from '../schemas';
import { IUserRepository } from './Contracts/IUserRepository';

@injectable()
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

  async updateUserAmount(amount: number, user_id: string) {
    await this.db.collection('users').doc(user_id).update({ amount });
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

  async findAllTransactionsByUserId(
    user_id: string,
  ): Promise<ListTransactionItem[]> {
    const [payerSnap, receiverSnap] = await Promise.all([
      this.db.collection('transactions').where('payer_id', '==', user_id).get(),
      this.db
        .collection('transactions')
        .where('receiver_id', '==', user_id)
        .get(),
    ]);
    const transactionsMap = new Map<string, ListTransactionItem>();

    payerSnap.forEach((doc) => {
      const transaction = doc.data() as Transaction;
      transactionsMap.set(doc.id, {
        amount: transaction.amount,
        direction: 'sent',
        status: transaction.status,
        transaction_id: doc.id,
      } as ListTransactionItem);
    });

    receiverSnap.forEach((doc) => {
      const transaction = doc.data() as Transaction;
      transactionsMap.set(doc.id, {
        amount: transaction.amount,
        direction: 'received',
        status: transaction.status,
        transaction_id: doc.id,
      } as ListTransactionItem);
    });

    return Array.from(transactionsMap.values());
  }
}
