import React from 'react';
import { WorkShift, ShiftCycle, ShiftOverride } from '../types';

interface Props {
  shifts: WorkShift[];
  cycle?: ShiftCycle | null;
}

export function ShiftLegend({ shifts, cycle }: Props) {
  if (shifts.length === 0) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar whitespace-nowrap">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block">Legenda Turni:</span>
        <div className="flex gap-4">
          {shifts.map(shift => (
            <div key={shift.id} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: shift.color }}
              />
              <span className="text-xs font-bold text-gray-700">{shift.name}</span>
            </div>
          ))}
        </div>
        
        {cycle && cycle.shiftIds.length > 0 && (
          <div className="ml-auto flex items-center gap-2 pl-4 border-l border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Ciclo:</span>
            <div className="flex gap-0.5">
              {cycle.shiftIds.map((sid, idx) => {
                const s = shifts.find(item => item.id === sid);
                if (!s) return null;
                return (
                  <div 
                    key={idx}
                    className="w-4 h-4 flex items-center justify-center text-[8px] font-black rounded-sm border border-white"
                    style={{ backgroundColor: s.color, color: 'rgba(0,0,0,0.5)' }}
                  >
                    {s.name}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
