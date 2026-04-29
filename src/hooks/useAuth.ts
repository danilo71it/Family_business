import { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Clear token if user changed or session expired? 
        // For simplicity we trust onAuthStateChanged.
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            groupId: null,
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        } else {
          const data = userSnap.data() as UserProfile;
          if (data.groupId) data.groupId = data.groupId.trim();
          setProfile(data);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const cleanData = { ...data };
    if (cleanData.groupId) cleanData.groupId = cleanData.groupId.trim();
    
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, cleanData, { merge: true });
    setProfile(prev => prev ? { ...prev, ...cleanData } : null);
  };

  return { user, profile, loading, login, logout, updateProfile };
}
