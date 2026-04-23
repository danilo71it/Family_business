import React from 'react';
import { WorkShift, ShiftCycle, ShiftOverride } from '../types';

interface Props {
  shifts: WorkShift[];
  cycle?: ShiftCycle | null;
  overrides?: ShiftOverride[];
}

export function ShiftLegend({ shifts, cycle, overrides = [] }: Props) {
  if (shifts.length === 0) return null;

  // Find IDs of shifts actually being used in cycle or overrides
  const usedShiftIds = new Set<string>();
  if (cycle) {
    cycle.shiftIds.forEach(id => usedShiftIds.add(id));
  }
  overrides.forEach(o => {
    if (o.shiftId) usedShiftIds.add(o.shiftId);
  });

  const usedShifts = shifts.filter(s => usedShiftIds.has(s.id));
  if (usedShifts.length === 0) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-2 px-3 shadow-sm">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar whitespace-nowrap">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block shrink-0">Legenda:</span>
        <div className="flex gap-4">
          {usedShifts.map(shift => (
            <div key={shift.id} className="flex items-center gap-2 shrink-0">
              <div 
                className="w-3 h-3 rounded-sm shadow-sm" 
                style={{ backgroundColor: shift.color }}
              />
              <span className="text-xs font-semibold text-gray-600">
                <span className="font-black mr-1" style={{ color: shift.color }}>{shift.name}</span>
                {shift.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
