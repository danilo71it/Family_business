import React from 'react';
import { WorkShift, ShiftCycle, ShiftOverride } from '../types';

interface Props {
  shifts: WorkShift[];
  cycle?: ShiftCycle | null;
  overrides?: ShiftOverride[];
}

export function ShiftLegend({ shifts, cycle, overrides = [] }: Props) {
  if (shifts.length === 0) return null;

  const displayedShifts = shifts;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-2 px-3 shadow-sm">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar whitespace-nowrap">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block shrink-0">Legenda:</span>
        <div className="flex gap-4">
          {displayedShifts.map(shift => (
            <div key={shift.id} className="flex items-center gap-2 shrink-0">
              <div 
                className="w-3 h-3 rounded-sm shadow-sm" 
                style={{ backgroundColor: shift.color }}
              />
              <span className="text-xs font-bold text-gray-600 uppercase">
                {shift.label || shift.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
