export type TransactionType = 'income' | 'expense';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ViewMode = 'calendar' | 'summary';

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
  
  // New fields
  isEstimate: boolean; // variabile vs certa
  isUnknownAmount?: boolean; // importo da definire
  isPrivacyActive?: boolean; // mostra descrizione invece di importo
  recurring: boolean;
  frequency?: RecurrenceFrequency;
  occurrenceCount?: number;
  reminderEnabled: boolean;
  parentTransactionId?: string; // linkage if generated from a recurrence
}

export interface FamilyGroup {
  id: string;
  name: string;
  ownerId: string;
  members: string[]; // array of uids
}

export interface WorkShift {
  id: string;
  name: string; // e.g., M, P, N, R
  color: string; // hex color
}

export interface ShiftCycle {
  shiftIds: string[]; // sequence of shifts (references to WorkShift.id)
  startDate: Date; // when the cycle starts
}

export interface ShiftOverride {
  date: Date;
  shiftId: string | null; // null if specifically no shift
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}
