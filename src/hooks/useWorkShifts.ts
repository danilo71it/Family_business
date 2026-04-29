import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, query, onSnapshot, 
  setDoc, doc, Timestamp, deleteDoc, getDocs, writeBatch
} from 'firebase/firestore';
import { WorkShift, ShiftCycle, ShiftOverride } from '../types';
import { handleFirestoreError } from '../lib/errorUtils';

export function useWorkShifts(groupId: string | null) {
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [cycle, setCycle] = useState<ShiftCycle | null>(null);
  const [overrides, setOverrides] = useState<ShiftOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setShifts([]);
      setCycle(null);
      setOverrides([]);
      setLoading(false);
      return;
    }

    const cleanGroupId = groupId.trim();
    setLoading(true);

    // 1. Listen to Shift Definitions
    const shiftsRef = collection(db, 'groups', cleanGroupId, 'shifts');
    const unsubShifts = onSnapshot(shiftsRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WorkShift));
      setShifts(docs);
    }, (err) => handleFirestoreError(err, 'list', `groups/${cleanGroupId}/shifts`));

    // 2. Listen to Cycle Config
    const cycleRef = doc(db, 'groups', cleanGroupId, 'config', 'shiftCycle');
    const unsubCycle = onSnapshot(cycleRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setCycle({
          shiftIds: data.shiftIds,
          startDate: data.startDate ? (data.startDate as Timestamp).toDate() : new Date()
        });
      } else {
        setCycle(null);
      }
    }, (err) => handleFirestoreError(err, 'get', `groups/${cleanGroupId}/config/shiftCycle`));

    // 3. Listen to Overrides
    const overridesRef = collection(db, 'groups', cleanGroupId, 'shiftOverrides');
    const unsubOverrides = onSnapshot(overridesRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          date: data.date ? (data.date as Timestamp).toDate() : new Date(),
          shiftId: data.shiftId
        } as ShiftOverride;
      });
      setOverrides(docs);
      setLoading(false);
    }, (err) => handleFirestoreError(err, 'list', `groups/${cleanGroupId}/shiftOverrides`));

  /* Non-ideal to have single loading for all 3, but simpler for now. 
     Better would be tracking each one. */

    return () => {
      unsubShifts();
      unsubCycle();
      unsubOverrides();
    };
  }, [groupId]);

  const saveShift = async (shift: WorkShift) => {
    if (!groupId) return;
    try {
      const shiftRef = doc(db, 'groups', groupId.trim(), 'shifts', shift.id);
      await setDoc(shiftRef, { 
        name: shift.name, 
        label: shift.label || '',
        color: shift.color 
      });
    } catch (err) {
      handleFirestoreError(err, 'create', `groups/${groupId}/shifts/${shift.id}`);
    }
  };

  const deleteShift = async (shiftId: string) => {
    if (!groupId) return;
    try {
      await deleteDoc(doc(db, 'groups', groupId.trim(), 'shifts', shiftId));
    } catch (err) {
      handleFirestoreError(err, 'delete', `groups/${groupId}/shifts/${shiftId}`);
    }
  };

  const saveCycle = async (newCycle: ShiftCycle) => {
    if (!groupId) return;
    try {
      const cycleRef = doc(db, 'groups', groupId.trim(), 'config', 'shiftCycle');
      await setDoc(cycleRef, {
        shiftIds: newCycle.shiftIds,
        startDate: Timestamp.fromDate(newCycle.startDate)
      });
    } catch (err) {
      handleFirestoreError(err, 'update', `groups/${groupId}/config/shiftCycle`);
    }
  };

  const saveOverride = async (override: ShiftOverride) => {
    if (!groupId) return;
    try {
      const dateStr = override.date.toISOString().split('T')[0];
      const overrideRef = doc(db, 'groups', groupId.trim(), 'shiftOverrides', dateStr);
      await setDoc(overrideRef, {
        date: Timestamp.fromDate(override.date),
        shiftId: override.shiftId
      });
    } catch (err) {
      handleFirestoreError(err, 'update', `groups/${groupId}/shiftOverrides`);
    }
  };

  const resetWorkShifts = async () => {
    if (!groupId) return;
    try {
      const cleanGroupId = groupId.trim();
      const overridesRef = collection(db, 'groups', cleanGroupId, 'shiftOverrides');
      const snapshot = await getDocs(overridesRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      
      const cycleRef = doc(db, 'groups', cleanGroupId, 'config', 'shiftCycle');
      batch.delete(cycleRef);
      
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'delete', `groups/${groupId}/shifts/reset`);
    }
  };

  return { shifts, cycle, overrides, loading, saveShift, deleteShift, saveCycle, saveOverride, resetWorkShifts };
}
