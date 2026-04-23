import React, { useState, useEffect } from 'react';
import { WorkShift, ShiftCycle, ShiftOverride } from '../types';
import { X, Plus, Trash2, Camera, Palette, Calendar as CalendarIcon, Check, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  shifts: WorkShift[];
  cycle: ShiftCycle | null;
  onSaveShift: (shift: WorkShift) => Promise<void>;
  onDeleteShift: (shiftId: string) => Promise<void>;
  onSaveCycle: (cycle: ShiftCycle) => Promise<void>;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6'
];

export function ShiftConfig({ shifts, cycle, onSaveShift, onDeleteShift, onSaveCycle, onClose }: Props) {
  const [editingShift, setEditingShift] = useState<Partial<WorkShift> | null>(null);
  const [tempShiftIds, setTempShiftIds] = useState<string[]>(cycle?.shiftIds || []);
  const [startDate, setStartDate] = useState(cycle ? format(cycle.startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));

  const DEFAULT_PRESETS: WorkShift[] = [
    { id: 'preset-m', name: 'M', label: 'MATTINA', color: '#f59e0b' },
    { id: 'preset-p', name: 'P', label: 'POMERIGGIO', color: '#06b6d4' },
    { id: 'preset-n', name: 'N', label: 'NOTTE', color: '#8b5cf6' },
    { id: 'preset-r', name: 'R', label: 'RIPOSO', color: '#94a3b8' },
    { id: 'preset-c', name: 'C', label: 'CHIUSURA', color: '#334155' },
  ];

  const handleAddShiftToCycle = (id: string) => {
    setTempShiftIds([...tempShiftIds, id]);
  };

  const handleRemoveFromCycle = (index: number) => {
    setTempShiftIds(tempShiftIds.filter((_, i) => i !== index));
  };

  const handleSaveCycle = () => {
    onSaveCycle({
      shiftIds: tempShiftIds,
      startDate: new Date(startDate)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Configurazione Turni</h2>
            <p className="text-xs text-gray-500">Definisci i tuoi turni e il ciclo ripetitivo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Section 1: Define Shifts */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">1. Tipi di Turno</h3>
                <button 
                  onClick={async () => {
                    if (window.confirm('Vuoi caricare i turni predefiniti? Tutti i turni esistenti verranno eliminati e sostituiti con la configurazione standard.')) {
                      // Delete existing
                      for (const s of shifts) {
                        await onDeleteShift(s.id);
                      }
                      // Load defaults
                      for (const p of DEFAULT_PRESETS) {
                        await onSaveShift(p);
                      }
                    }
                  }}
                  className="px-3 py-1 bg-blue-50 text-[10px] font-bold text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                >
                  CARICA PREDEFINITI
                </button>
              </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {shifts.map(s => (
                <div 
                  key={s.id} 
                  className="group relative flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all cursor-pointer"
                  onClick={() => setEditingShift(s)}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shadow-sm shrink-0" style={{ backgroundColor: s.color, color: 'white' }}>
                    {s.name}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 uppercase truncate">{s.label || s.name}</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteShift(s.id); }}
                    className="absolute -top-2 -right-2 p-1 bg-white shadow-sm border border-gray-100 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              
              <button 
                onClick={() => setEditingShift({ id: Math.random().toString(36).substr(2, 9), name: '', color: PRESET_COLORS[0] })}
                className="flex flex-col items-center justify-center gap-1 p-3 bg-white border border-dashed border-gray-200 rounded-2xl text-blue-600 hover:bg-blue-50 transition-all"
              >
                <Plus size={16} />
                <span className="text-[10px] font-bold uppercase">Nuovo</span>
              </button>
            </div>

            {editingShift && (
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-4 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-600 uppercase">Sigla (es. M)</label>
                    <input 
                      type="text" 
                      maxLength={3}
                      value={editingShift.name}
                      onChange={e => setEditingShift({...editingShift, name: e.target.value.toUpperCase()})}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-blue-200 text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-600 uppercase">Nome Completo</label>
                    <input 
                      type="text" 
                      value={editingShift.label || ''}
                      onChange={e => setEditingShift({...editingShift, label: e.target.value})}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-blue-200 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="es. MATTINA"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-blue-600 uppercase">Colore</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button 
                        key={c}
                        onClick={() => setEditingShift({...editingShift, color: c})}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${editingShift.color === c ? 'border-blue-600 scale-110 shadow-sm' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingShift(null)}
                    className="flex-1 py-2 text-xs font-bold text-blue-400 hover:bg-white rounded-xl"
                  >
                    Annulla
                  </button>
                  <button 
                    disabled={!editingShift.name}
                    onClick={() => {
                      onSaveShift(editingShift as WorkShift);
                      setEditingShift(null);
                    }}
                    className="flex-2 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-100 disabled:opacity-50"
                  >
                    Salva Turno
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Define Cycle */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">2. Sequenza Ciclo</h3>
            
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                {tempShiftIds.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Seleziona i turni sotto per creare la sequenza...</p>
                )}
                {tempShiftIds.map((sid, idx) => {
                  const s = shifts.find(item => item.id === sid);
                  if (!s) return null;
                  return (
                    <button 
                      key={idx}
                      onClick={() => handleRemoveFromCycle(idx)}
                      className="group relative w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm transition-all active:scale-95"
                      style={{ backgroundColor: s.color, color: 'white' }}
                    >
                      {s.name}
                      <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                        <X size={8} className="text-red-500" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 p-2 bg-white rounded-xl border border-gray-100 overflow-x-auto no-scrollbar">
                {shifts.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => handleAddShiftToCycle(s.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-all min-w-[50px]"
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black" style={{ backgroundColor: s.color, color: 'white' }}>
                      {s.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-start">
               <button 
                onClick={() => setTempShiftIds([])}
                className="text-[10px] font-bold text-red-400 hover:text-red-500 uppercase tracking-wider"
               >
                 Svuota Ciclo
               </button>
            </div>
          </section>

          {/* Section 3: Start Date */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">3. Data Inizio</h3>
            <div className="relative">
              <CalendarIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
            <p className="text-[10px] text-gray-400 italic font-medium px-2">
              Il ciclo inizierà a ripetersi da questa data in avanti.
            </p>
          </section>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <button 
            disabled={tempShiftIds.length === 0}
            onClick={handleSaveCycle}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-[20px] shadow-xl shadow-blue-100 flex items-center justify-center gap-3 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
          >
            <Check size={20} />
            Applica al Calendario
          </button>
        </div>
      </div>
    </div>
  );
}
