import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, deleteDoc, doc, serverTimestamp, 
  Timestamp, setDoc
} from 'firebase/firestore';
import { Transaction, FamilyGroup, TransactionType, RecurrenceFrequency } from '../types';
import { handleFirestoreError } from '../lib/errorUtils';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

export function useFinance(groupId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setTransactions([]);
      setGroup(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const groupRef = doc(db, 'groups', groupId);
    const unsubGroup = onSnapshot(groupRef, (doc) => {
      if (doc.exists()) {
        setGroup({ id: doc.id, ...doc.data() } as FamilyGroup);
      }
    }, (err) => handleFirestoreError(err, 'get', `groups/${groupId}`));

    const transactionsRef = collection(db, 'groups', groupId, 'transactions');
    const q = query(transactionsRef, orderBy('date', 'desc'));
    
    const unsubTransactions = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(),
          createdAt: (data.createdAt as Timestamp).toDate(),
          updatedAt: (data.updatedAt as Timestamp).toDate(),
        } as Transaction;
      });
      setTransactions(docs);
      setLoading(false);
    }, (err) => handleFirestoreError(err, 'list', `groups/${groupId}/transactions`));

    return () => {
      unsubGroup();
      unsubTransactions();
    };
  }, [groupId]);

  const addTransaction = async (t: {
    amount: number;
    type: TransactionType;
    category: string;
    description: string;
    date: Date;
    userId: string;
    isEstimate: boolean;
    recurring: boolean;
    frequency?: RecurrenceFrequency;
    occurrenceCount?: number;
    reminderEnabled: boolean;
  }) => {
    if (!groupId) return;
    try {
      const transactionsRef = collection(db, 'groups', groupId, 'transactions');
      
      const count = t.recurring ? (t.occurrenceCount || 1) : 1;
      const parentId = t.recurring ? doc(transactionsRef).id : undefined;

      for (let i = 0; i < count; i++) {
        let occurrenceDate = new Date(t.date);
        if (t.recurring && i > 0) {
          if (t.frequency === 'daily') occurrenceDate = addDays(t.date, i);
          else if (t.frequency === 'weekly') occurrenceDate = addWeeks(t.date, i);
          else if (t.frequency === 'monthly') occurrenceDate = addMonths(t.date, i);
          else if (t.frequency === 'yearly') occurrenceDate = addYears(t.date, i);
        }

        const data: any = {
          amount: (i > 0 && t.isEstimate) ? 0 : t.amount,
          type: t.type,
          category: t.category,
          description: t.description || '',
          date: Timestamp.fromDate(occurrenceDate),
          userId: t.userId,
          groupId,
          isEstimate: t.isEstimate,
          recurring: t.recurring,
          reminderEnabled: t.reminderEnabled,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (t.recurring) {
          data.frequency = t.frequency;
          data.occurrenceCount = t.occurrenceCount;
          data.parentTransactionId = parentId;
        }

        await addDoc(transactionsRef, data);
      }
    } catch (err) {
      handleFirestoreError(err, 'create', `groups/${groupId}/transactions`);
    }
  };

  const createGroup = async (name: string, userId: string) => {
    try {
      const groupRef = doc(collection(db, 'groups'));
      const newGroup = {
        name,
        ownerId: userId,
        members: [userId],
      };
      await setDoc(groupRef, newGroup);
      return groupRef.id;
    } catch (err) {
      handleFirestoreError(err, 'create', 'groups');
      return '';
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!groupId) return;
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'transactions', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `groups/${groupId}/transactions/${id}`);
    }
  };

  return { transactions, group, loading, addTransaction, deleteTransaction, createGroup };
}
