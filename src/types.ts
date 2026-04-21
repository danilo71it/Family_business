export type TransactionType = 'income' | 'expense';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  groupId: string | null;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: Date;
  userId: string;
  groupId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  members: string[]; // array of uids
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}
