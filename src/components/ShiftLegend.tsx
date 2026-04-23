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
    <div className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 shadow-sm min-h-[48px] flex items-center">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar whitespace-nowrap">
        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block shrink-0">Legenda:</span>
        <div className="flex gap-2 sm:gap-4">
          {displayedShifts.map(shift => (
            <div key={shift.id} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div 
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm shadow-sm" 
                style={{ backgroundColor: shift.color }}
              />
              <span className="text-[8px] sm:text-xs font-bold text-gray-600 uppercase leading-none">
                {shift.label || shift.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
