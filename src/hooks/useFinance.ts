import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, deleteDoc, doc, serverTimestamp, 
  Timestamp, setDoc, writeBatch, getDocs, deleteField
} from 'firebase/firestore';
import { Transaction, FamilyGroup, TransactionType, RecurrenceFrequency } from '../types';
import { handleFirestoreError } from '../lib/errorUtils';
import { addDays, addWeeks, addMonths, addYears, startOfMonth, endOfMonth } from 'date-fns';

export function useFinance(groupId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cleanGroupId = groupId?.trim();
    if (!cleanGroupId) {
      setTransactions([]);
      setGroup(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const groupRef = doc(db, 'groups', cleanGroupId);
    const unsubGroup = onSnapshot(groupRef, (doc) => {
      if (doc.exists()) {
        setGroup({ id: doc.id, ...doc.data() } as FamilyGroup);
      }
    }, (err) => handleFirestoreError(err, 'get', `groups/${cleanGroupId}`));

    const transactionsRef = collection(db, 'groups', cleanGroupId, 'transactions');
    const q = query(transactionsRef, orderBy('date', 'desc'));
    
    const unsubTransactions = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date ? (data.date as Timestamp).toDate() : new Date(),
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
          updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
        } as Transaction;
      });
      setTransactions(docs);
      setLoading(false);
    }, (err) => handleFirestoreError(err, 'list', `groups/${cleanGroupId}/transactions`));

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
    note?: string;
    address?: string;
    time?: string;
    reminders?: any[];
    date: Date;
    userId: string;
    isEstimate: boolean;
    isUnknownAmount?: boolean;
    isPrivacyActive?: boolean;
    recurring: boolean;
    frequency?: RecurrenceFrequency;
    occurrenceCount?: number;
    reminderEnabled: boolean;
  }) => {
    const cleanGroupId = groupId?.trim();
    if (!cleanGroupId) return;
    try {
      const transactionsRef = collection(db, 'groups', cleanGroupId, 'transactions');
      
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
          note: t.note || '',
          address: t.address || '',
          time: t.time || '',
          reminders: t.reminders || [],
          date: Timestamp.fromDate(occurrenceDate),
          userId: t.userId,
          groupId: cleanGroupId,
          isEstimate: i === 0 ? false : (t.isEstimate || false),
          isUnknownAmount: t.isUnknownAmount || false,
          isPrivacyActive: t.isPrivacyActive || false,
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
      const cleanGroupId = groupId?.trim();
      handleFirestoreError(err, 'create', `groups/${cleanGroupId}/transactions`);
    }
  };

  const createGroup = async (name: string, userId: string) => {
    try {
      const groupRef = doc(collection(db, 'groups'));
      const gid = groupRef.id.trim();
      const newGroup = {
        name: name.trim(),
        ownerId: userId,
        members: [userId],
      };
      await setDoc(doc(db, 'groups', gid), newGroup);
      return gid;
    } catch (err) {
      handleFirestoreError(err, 'create', 'groups');
      return '';
    }
  };

  const deleteTransaction = async (id: string) => {
    const cleanGroupId = groupId?.trim();
    if (!cleanGroupId) return;
    try {
      await deleteDoc(doc(db, 'groups', cleanGroupId, 'transactions', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `groups/${cleanGroupId}/transactions/${id}`);
    }
  };

  const deleteTransactionSeries = async (parentTransactionId: string) => {
    const cleanGroupId = groupId?.trim();
    if (!cleanGroupId || !parentTransactionId) return;
    try {
      const transactionsRef = collection(db, 'groups', cleanGroupId, 'transactions');
      const q = query(transactionsRef, where('parentTransactionId', '==', parentTransactionId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'delete', `groups/${cleanGroupId}/transactions/series/${parentTransactionId}`);
    }
  };

  const updateTransaction = async (id: string, updates: any) => {
    const cleanGroupId = groupId?.trim();
    if (!cleanGroupId) return;
    try {
      const docRef = doc(db, 'groups', cleanGroupId, 'transactions', id);
      const dataToSave: any = { ...updates, updatedAt: serverTimestamp() };
      
      // Handle date conversion if present
      if (updates.date) {
        dataToSave.date = Timestamp.fromDate(updates.date);
      }

      // Logic for shifting future recurring dates
      if (updates.shiftFutureDates && updates.originalDate && updates.date) {
        const currentTx = transactions.find(t => t.id === id);
        if (currentTx?.parentTransactionId) {
          const timeDiff = updates.date.getTime() - updates.originalDate.getTime();
          
          const transactionsRef = collection(db, 'groups', cleanGroupId, 'transactions');
          const originalDateTs = updates.originalDate instanceof Date ? Timestamp.fromDate(updates.originalDate) : updates.originalDate;
          
          const q = query(
            transactionsRef, 
            where('parentTransactionId', '==', currentTx.parentTransactionId),
            where('date', '>', originalDateTs)
          );
          
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          
          snapshot.docs.forEach(doc => {
            const rawDate = doc.data().date;
            const oldDate = rawDate ? (rawDate as Timestamp).toDate() : new Date();
            const newDate = new Date(oldDate.getTime() + timeDiff);
            batch.update(doc.ref, { 
              date: Timestamp.fromDate(newDate),
              updatedAt: serverTimestamp() 
            });
          });
          
          await batch.commit();
        }
        
        // Clean up internal flags
        delete dataToSave.shiftFutureDates;
        delete dataToSave.originalDate;
      }

      // Logic for stopping recurrence
      if (updates.recurring === false) {
        const currentTx = transactions.find(t => t.id === id);
        if (currentTx?.parentTransactionId) {
          const parentTxId = currentTx.parentTransactionId;
          const txDate = Timestamp.fromDate(currentTx.date);
          
          const transactionsRef = collection(db, 'groups', cleanGroupId, 'transactions');
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
          dataToSave.parentTransactionId = deleteField(); 
          dataToSave.frequency = deleteField();
          dataToSave.occurrenceCount = deleteField();

          await batch.commit();
        }
      }
      
      await setDoc(docRef, dataToSave, { merge: true });
    } catch (err) {
      handleFirestoreError(err, 'update', `groups/${cleanGroupId}/transactions/${id}`);
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
    deleteTransactionSeries,
    resetMonthTransactions, resetAllTransactions,
    createGroup 
  };
}
