import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, deleteDoc, doc, serverTimestamp, 
  Timestamp, setDoc, writeBatch, getDocs
} from 'firebase/firestore';
import { Transaction, FamilyGroup, TransactionType, RecurrenceFrequency } from '../types';
import { handleFirestoreError } from '../lib/errorUtils';
import { addDays, addWeeks, addMonths, addYears, startOfMonth, endOfMonth } from 'date-fns';

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
      
      const INFINITE_LIMIT = 60; // 5 years limit for "infinite" recurring to avoid browser hang
      let count = t.recurring ? (t.occurrenceCount || 1) : 1;
      if (t.recurring && (!t.occurrenceCount || t.occurrenceCount > INFINITE_LIMIT)) {
        count = INFINITE_LIMIT;
      }
      
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
          isEstimate: i === 0 ? false : t.isEstimate, // First is always certain if user wants, others follow estimate flag
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

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!groupId) return;
    try {
      const docRef = doc(db, 'groups', groupId, 'transactions', id);
      const dataToSave: any = { ...updates, updatedAt: serverTimestamp() };
      
      // Handle date conversion if present
      if (updates.date) {
        dataToSave.date = Timestamp.fromDate(updates.date);
      }

      // Logic for stopping recurrence
      if (updates.recurring === false) {
        const currentTx = transactions.find(t => t.id === id);
        if (currentTx?.parentTransactionId) {
          const parentTxId = currentTx.parentTransactionId;
          const txDate = Timestamp.fromDate(currentTx.date);
          
          const transactionsRef = collection(db, 'groups', groupId, 'transactions');
          // Find all FUTURE transactions in this series
          const q = query(
            transactionsRef, 
            where('parentTransactionId', '==', parentTxId),
            where('date', '>', txDate)
          );
          
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.docs.forEach(d => batch.delete(d.ref));
          
          // Also explicitly remove recurrence fields from the current document being updated
          // In Firestore, to remove fields with merge: true, we can use deleteField() or just set them to null/delete if we use setDoc without merge
          // But here we use merge: true. Many SDKs use fieldValue.delete()
          // Let's import deleteField from firebase/firestore
          dataToSave.parentTransactionId = null; 
          dataToSave.frequency = null;
          dataToSave.occurrenceCount = null;

          await batch.commit();
        }
      }
      
      await setDoc(docRef, dataToSave, { merge: true });
    } catch (err) {
      handleFirestoreError(err, 'update', `groups/${groupId}/transactions/${id}`);
    }
  };

  const resetMonthTransactions = async (monthDate: Date) => {
    if (!groupId) return;
    try {
      const start = Timestamp.fromDate(startOfMonth(monthDate));
      const end = Timestamp.fromDate(endOfMonth(monthDate));
      
      const transactionsRef = collection(db, 'groups', groupId, 'transactions');
      const q = query(transactionsRef, where('date', '>=', start), where('date', '<=', end));
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'delete', `groups/${groupId}/transactions/reset`);
    }
  };

  const resetAllTransactions = async () => {
    if (!groupId) return;
    try {
      const transactionsRef = collection(db, 'groups', groupId, 'transactions');
      const snapshot = await getDocs(transactionsRef);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'delete', `groups/${groupId}/transactions/reset-all`);
    }
  };

  return { 
    transactions, group, loading, 
    addTransaction, deleteTransaction, updateTransaction, 
    resetMonthTransactions, resetAllTransactions,
    createGroup 
  };
}
