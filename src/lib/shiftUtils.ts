import { isSameDay, differenceInDays, startOfDay } from 'date-fns';
import { WorkShift, ShiftCycle, ShiftOverride } from '../types';

export function getShiftForDay(
  day: Date, 
  shifts: WorkShift[], 
  cycle: ShiftCycle | null, 
  overrides: ShiftOverride[]
): WorkShift | null {
  const dayStart = startOfDay(day);
  
  // 1. Check overrides
  const override = overrides.find(o => isSameDay(o.date, dayStart));
  if (override) {
    if (!override.shiftId) return null;
    return shifts.find(s => s.id === override.shiftId) || null;
  }

  // 2. Check cycle
  if (!cycle || cycle.shiftIds.length === 0) return null;
  
  const cycleStart = startOfDay(cycle.startDate);
  const diff = differenceInDays(dayStart, cycleStart);
  
  if (diff < 0) return null; 
  
  const index = diff % cycle.shiftIds.length;
  const shiftId = cycle.shiftIds[index];
  
  return shifts.find(s => s.id === shiftId) || null;
}
