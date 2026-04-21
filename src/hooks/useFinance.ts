import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, 
  Timestamp, CollectionReference, setDoc, getDocs
} from 'firebase/firestore';
import { Transaction, FamilyGroup, TransactionType } from '../types';
import { handleFirestoreError } from '../lib/errorUtils';

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

    // Group listener
    const groupRef = doc(db, 'groups', groupId);
    const unsubGroup = onSnapshot(groupRef, (doc) => {
      if (doc.exists()) {
        setGroup({ id: doc.id, ...doc.data() } as FamilyGroup);
      }
    }, (err) => handleFirestoreError(err, 'get', `groups/${groupId}`));

    // Transactions listener
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

  const addTransaction = async (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'groupId'>) => {
    if (!groupId) return;
    try {
      const transactionsRef = collection(db, 'groups', groupId, 'transactions');
      await addDoc(transactionsRef, {
        ...t,
        groupId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
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
