import { injectable, singleton } from 'tsyringe';
import {
  CreateTransactionDTO,
  CreateTransactionResult,
  Idempotency,
  Transaction,
} from '../schemas';
import { ITransactionRepository } from './Contracts/ITransactioRepository';
import { getFirestore } from 'firebase-admin/firestore';

@injectable()
@singleton()
export class TransactionRepository implements ITransactionRepository {
  private readonly db = getFirestore();

  async createIdempotency(data: Idempotency): Promise<Idempotency> {
    const insertData = await (
      await this.db.collection('idempotency').add(data)
    ).get();

    return insertData.data() as Idempotency;
  }

  async findIdempotency(params: {
    userToken?: string;
    status?: 'finished' | 'active';
    key?: string;
  }): Promise<Idempotency | null> {
    let query = this.db.collection('idempotency') as FirebaseFirestore.Query;

    if (params.userToken) {
      query = query.where('userToken', '==', params.userToken);
    }
    if (params.status) {
      query = query.where('status', '==', params.status);
    }
    if (params.key) {
      query = query.where('key', '==', params.key);
    }

    const snapshot = await query.limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Idempotency;
  }

  async finishIdempotencyByKey(key: string): Promise<void> {
    const snapshot = await this.db
      .collection('idempotency')
      .where('key', '==', key)
      .limit(1)
      .get();

    if (snapshot.empty) return;

    const docRef = snapshot.docs[0].ref;
    await docRef.update({ status: 'finished' });
    return;
  }

  async createTransation(
    transactionData: CreateTransactionDTO,
    idempotencyKey: string,
  ): Promise<CreateTransactionResult> {
    const result = await this.db.runTransaction(async (t) => {
      const idempotencyQuery = await t.get(
        this.db
          .collection('idempotency')
          .where('key', '==', idempotencyKey)
          .limit(1),
      );

      const idempotencyDoc = idempotencyQuery.docs[0].ref;

      const payerRef = this.db
        .collection('users')
        .doc(transactionData.payer_id);
      const receiverRef = this.db
        .collection('users')
        .doc(transactionData.receiver_id);

      const [payerSnap, receiverSnap] = await Promise.all([
        t.get(payerRef),
        t.get(receiverRef),
      ]);

      const payer = payerSnap.data();
      const receiver = receiverSnap.data();

      t.update(receiverRef, {
        balance: receiver!.balance + transactionData.amount,
      });
      t.update(payerRef, {
        balance: payer!.balance - transactionData.amount,
      });

      const transactionRef = this.db.collection('transactions').doc();
      const created_at = new Date();
      t.set(transactionRef, {
        ...transactionData,
        created_at,
      });

      t.update(idempotencyDoc, { status: 'finished' });

      return {
        id: transactionRef.id,
        created_at,

        transactionRef,
      };
    });

    const transactionCreated = await this.findTransactionById(result.id);

    return {
      status: transactionCreated!.status,
      created_at: transactionCreated!.created_at,
      transaction_id: result.id,
    } as CreateTransactionResult;
  }

  async findTransactionById(
    transaction_id: string,
  ): Promise<Transaction | null> {
    const transactionSnap = await this.db
      .collection('transactions')
      .doc(transaction_id)
      .get();

    if (!transactionSnap.exists) return null;

    const transactionData = transactionSnap.data() as CreateTransactionDTO & {
      created_at: FirebaseFirestore.Timestamp;
    };

    return {
      amount: transactionData.amount,
      created_at: transactionData.created_at.toDate(),
      payer_id: transactionData.payer_id,
      receiver_id: transactionData.receiver_id,
      status: transactionData.status,
      transaction_id: transactionSnap.id,
    };
  }

  async updateTransactionStatus(
    transaction_id: string,
    status: 'approved' | 'failed',
  ): Promise<void> {
    await this.db
      .collection('transactions')
      .doc(transaction_id)
      .update({ status });
  }
}
