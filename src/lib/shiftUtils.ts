import { isSameDay, differenceInDays, startOfDay } from 'date-fns';
import { WorkShift, ShiftCycle, ShiftOverride } from '../types';
import { isHoliday } from './holidayUtils';

export function getShiftForDay(
  day: Date, 
  shifts: WorkShift[], 
  cycle: ShiftCycle | null, 
  overrides: ShiftOverride[]
): WorkShift | null {
  const dayStart = startOfDay(day);
  
  // 0. Holiday Logic - Holidays command the rotation
  const holiday = isHoliday(dayStart);

  // 1. Check overrides (User manual force always wins)
  const override = overrides.find(o => isSameDay(o.date, dayStart));
  if (override) {
    if (!override.shiftId) return null;
    return shifts.find(s => s.id === override.shiftId) || null;
  }

  // If it's a holiday and no override, force shift to grey (Riposo/Chiusura)
  if (holiday) {
    // Try to find Riposo 'R' or Chiusura 'X' or some grey color shift
    return shifts.find(s => s.name === 'R' || s.name === 'X' || s.color === '#94a3b8' || s.color === '#64748b') || null;
  }

  // 2. Check cycle
  if (!cycle || cycle.shiftIds.length === 0) return null;
  
  const cycleStart = startOfDay(cycle.startDate);
  const diff = differenceInDays(dayStart, cycleStart);
  
  const cycleLength = cycle.shiftIds.length;
  let index = diff % cycleLength;
  if (index < 0) index += cycleLength; // Continuity fix for dates before start date
  
  const shiftId = cycle.shiftIds[index];
  
  return shifts.find(s => s.id === shiftId) || null;
}
