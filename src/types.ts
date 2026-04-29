export type TransactionType = 'income' | 'expense' | 'appointment' | 'note';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ViewMode = 'calendar' | 'summary';
export type ReminderUnit = 'minutes' | 'hours' | 'days';

export interface Reminder {
  value: number;
  unit: ReminderUnit;
  triggered?: boolean;
}

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
  note?: string; 
  
  // New/Enhanced fields
  isEstimate: boolean; // variabile vs certa
  isUnknownAmount?: boolean; // importo da definire
  isPrivacyActive?: boolean; // mostra descrizione invece di importo
  recurring: boolean;
  frequency?: RecurrenceFrequency;
  occurrenceCount?: number;
  reminderEnabled: boolean;
  parentTransactionId?: string; // linkage if generated from a recurrence

  // Appointment specific fields
  address?: string;
  time?: string; // HH:mm
  reminders?: Reminder[];
  googleEventId?: string; 
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
  label?: string; // e.g., Mattina, Pomeriggio
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
