import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Plus, Minus, Calendar as CalendarIcon, 
  MapPin, Bell, StickyNote, TrendingUp, TrendingDown, 
  Clock, Trash2, Pencil, ExternalLink, ChevronRight, Check
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Transaction, WorkShift, ShiftCycle, ShiftOverride, TransactionType, Reminder } from '../types';
import { getShiftForDay } from '../lib/shiftUtils';
import { motion, AnimatePresence } from 'motion/react';
import { TransactionForm } from './TransactionForm';

interface Props {
  date: Date;
  transactions: Transaction[];
  shifts: WorkShift[];
  cycle: ShiftCycle | null;
  overrides: ShiftOverride[];
  userId: string;
  onAddTransaction: (t: any) => Promise<void>;
  onUpdateTransaction: (id: string, t: any) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onSaveShiftOverride: (override: ShiftOverride) => Promise<void>;
  onClose: () => void;
}

type FormType = 'none' | 'movement' | 'appointment' | 'note';

export function DailyPanel({ 
  date, transactions, shifts, cycle, overrides, userId,
  onAddTransaction, onUpdateTransaction, onDeleteTransaction, onSaveShiftOverride, onClose 
}: Props) {
  const [activeForm, setActiveForm] = useState<FormType>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const dayTransactions = transactions.filter(t => isSameDay(t.date, date));
  const currentShift = getShiftForDay(date, shifts, cycle, overrides);

  useEffect(() => {
    if (activeForm !== 'none' && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeForm, editingId]);

  // Group transactions
  const movements = dayTransactions.filter(t => t.type === 'income' || t.type === 'expense');
  const appointments = dayTransactions.filter(t => t.type === 'appointment');
  const notes = dayTransactions.filter(t => t.type === 'note');

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    if (t.type === 'income' || t.type === 'expense') setActiveForm('movement');
    else if (t.type === 'appointment') setActiveForm('appointment');
    else if (t.type === 'note') setActiveForm('note');
  };

  const resetForm = () => {
    setActiveForm('none');
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-gray-50 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-white p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight capitalize">
              {format(date, 'EEEE d MMMM yyyy', { locale: it })}
            </h2>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Gestione Giornaliera</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. SHIFT SELECTION */}
          <section className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Clock size={16} />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Turno di Lavoro</h3>
            </div>
            <div className="flex flex-nowrap overflow-x-auto px-1 py-4 -my-4 pb-2 gap-[5px] scrollbar-hide">
              <div className="flex flex-nowrap gap-[5px] pr-6 py-1">
                {shifts.map(s => {
                  const isSelected = currentShift?.id === s.id;
                  return (
                    <button 
                      key={s.id}
                      onClick={() => onSaveShiftOverride({ date, shiftId: s.id })}
                      className={`aspect-square h-[34px] shrink-0 rounded-xl border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                        isSelected ? 'ring-4 ring-offset-2 z-10' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ 
                        backgroundColor: s.color, 
                        color: 'white',
                        borderColor: isSelected ? 'white' : 'transparent',
                        // @ts-ignore
                        '--tw-ring-color': `${s.color}40`
                      }}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 2. EXISTING ENTRIES */}
          <div className="space-y-4">
            {/* MOVEMENTS */}
            {movements.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Movimenti Contabili</h4>
                <div className="grid gap-2">
                  {movements.map(m => (
                    <div key={m.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${m.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {m.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm leading-tight">{m.category}</p>
                          <p className="text-[10px] font-mono font-bold text-gray-400 uppercase mt-0.5">
                            {m.isUnknownAmount ? 'DA DEFINIRE' : m.amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(m)} className="p-2 hover:bg-gray-50 rounded-lg text-blue-500"><Pencil size={16} /></button>
                        <button onClick={() => onDeleteTransaction(m.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* APPOINTMENTS */}
            {appointments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Appuntamenti</h4>
                <div className="grid gap-2">
                  {appointments.map(a => (
                    <div key={a.id} className="bg-white p-4 rounded-2xl border border-blue-50 shadow-sm flex flex-col gap-3 group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                      <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 mt-1">
                            <CalendarIcon size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900 leading-tight">{a.category}</p>
                              {a.time && (
                                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black border border-blue-100 flex items-center gap-1">
                                  <Clock size={10} />
                                  {a.time}
                                </span>
                              )}
                            </div>
                            {a.description && <p className="text-sm text-gray-500 mt-1">{a.description}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => handleEdit(a)} className="p-2 hover:bg-gray-50 rounded-lg text-blue-500"><Pencil size={16} /></button>
                          <button onClick={() => onDeleteTransaction(a.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      
                      {(a.address || (a.reminders && a.reminders.length > 0)) && (
                        <div className="flex flex-wrap gap-2 mt-1 pl-11">
                          {a.address && (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-bold hover:bg-blue-50 hover:text-blue-600 transition-all border border-gray-100"
                            >
                              <MapPin size={12} />
                              VEDI MAPPA
                              <ExternalLink size={10} />
                            </a>
                          )}
                          {a.reminders?.map((r, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-bold border border-purple-100">
                              <Bell size={12} />
                              {r.value} {r.unit === 'minutes' ? 'min' : r.unit === 'hours' ? 'ore' : 'giorni'} prima
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NOTES */}
            {notes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Note Libere</h4>
                <div className="grid gap-2">
                  {notes.map(n => (
                    <div key={n.id} className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 shadow-sm flex items-start justify-between group relative overflow-hidden italic text-gray-700">
                      <div className="flex items-start gap-3">
                        <StickyNote size={16} className="text-amber-500 mt-1 shrink-0" />
                        <p className="text-sm whitespace-pre-wrap">{n.note}</p>
                      </div>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
                        <button onClick={() => handleEdit(n)} className="p-2 hover:bg-white/50 rounded-lg text-blue-500"><Pencil size={16} /></button>
                        <button onClick={() => onDeleteTransaction(n.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. ADD NEW OPTIONS (If not editing or adding) */}
          <div ref={formRef}>
            {activeForm === 'none' ? (
              <div className="pt-6 border-t border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">Cosa vuoi aggiungere?</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button 
                    onClick={() => setActiveForm('movement')}
                    className="p-4 bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-3xl transition-all flex flex-col items-center gap-3 group text-center shadow-sm"
                  >
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                      <TrendingUp size={24} />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Movimenti</span>
                  </button>
                  <button 
                    onClick={() => setActiveForm('appointment')}
                    className="p-4 bg-white hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-3xl transition-all flex flex-col items-center gap-3 group text-center shadow-sm"
                  >
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                      <CalendarIcon size={24} />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Appuntamento</span>
                  </button>
                  <button 
                    onClick={() => setActiveForm('note')}
                    className="p-4 bg-white hover:bg-amber-50 border border-gray-100 hover:border-amber-200 rounded-3xl transition-all flex flex-col items-center gap-3 group text-center shadow-sm"
                  >
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                      <StickyNote size={24} />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Nota</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-6 border-t border-gray-200 animate-in slide-in-from-bottom-4 duration-300">
                {activeForm === 'movement' && (
                  <TransactionForm 
                      onAdd={async (t) => { await onAddTransaction(t); resetForm(); }}
                      onUpdate={async (id, t) => { await onUpdateTransaction(id, t); resetForm(); }}
                      onDelete={async (id) => { await onDeleteTransaction(id); resetForm(); }}
                      userId={userId}
                      defaultDate={date}
                      initialData={editingId ? dayTransactions.find(t => t.id === editingId) : undefined}
                  />
                )}
                {activeForm === 'appointment' && (
                  <AppointmentForm 
                      onSave={async (data) => {
                        if (editingId) await onUpdateTransaction(editingId, { ...data, date });
                        else await onAddTransaction({ ...data, date, type: 'appointment', userId });
                        resetForm();
                      }}
                      onCancel={resetForm}
                      initialData={editingId ? dayTransactions.find(t => t.id === editingId) : undefined}
                  />
                )}
                {activeForm === 'note' && (
                  <NoteForm 
                      onSave={async (noteText) => {
                        if (editingId) await onUpdateTransaction(editingId, { note: noteText, date });
                        else await onAddTransaction({ note: noteText, date, type: 'note', userId, amount: 0, category: 'Nota', isEstimate: false, recurring: false, reminderEnabled: false });
                        resetForm();
                      }}
                      onCancel={resetForm}
                      initialData={editingId ? dayTransactions.find(t => t.id === editingId) : undefined}
                  />
                )}
                {activeForm !== 'none' && !editingId && (
                  <button 
                    onClick={resetForm}
                    className="w-full mt-4 py-2 text-gray-400 font-bold hover:text-gray-600 transition-all text-xs"
                  >
                    ANNULLA
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Inner Forms

interface AppointmentFormProps {
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  initialData?: Transaction;
}

function AppointmentForm({ onSave, onCancel, initialData }: AppointmentFormProps) {
  const [category, setCategory] = useState(initialData?.category || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [lastSelectedAddress, setLastSelectedAddress] = useState(initialData?.address || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [time, setTime] = useState(initialData?.time || '');
  const [reminders, setReminders] = useState<Reminder[]>(initialData?.reminders || []);
  const [newReminderValue, setNewReminderValue] = useState('15');
  const [newReminderUnit, setNewReminderUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address lookup debounced
  useEffect(() => {
    if (address.length < 3 || address === lastSelectedAddress) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1&limit=5&countrycodes=it`);
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [address, lastSelectedAddress]);

  const addReminder = () => {
    const val = parseInt(newReminderValue);
    if (!isNaN(val)) {
      setReminders([...reminders, { value: val, unit: newReminderUnit, triggered: false }]);
    }
  };

  const removeReminder = (idx: number) => {
    setReminders(reminders.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) return;
    setIsSubmitting(true);
    
    // Reset or ensure triggered is false on new/edited reminders
    const updatedReminders = reminders.map(r => ({ ...r, triggered: false }));

    await onSave({
      category: category.trim(),
      description: description.trim(),
      address: address.trim(),
      time,
      reminders: updatedReminders,
      amount: 0,
      isEstimate: false,
      recurring: false,
      type: 'appointment',
      reminderEnabled: reminders.length > 0
    });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
        <CalendarIcon size={16} /> 
        {initialData ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}
      </h3>
      
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase">Titolo</label>
          <input 
            type="text" 
            value={category} 
            onChange={e => setCategory(e.target.value)}
            placeholder="Cosa devi fare?"
            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase">Descrizione</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            placeholder="Dettagli aggiuntivi..."
            rows={2}
            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium resize-none"
          />
        </div>

        <div className="space-y-1 relative">
          <label className="text-[10px] font-bold text-gray-400 pl-1 uppercase">Indirizzo (Google Maps)</label>
          <div className="relative">
            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={address} 
              onChange={e => setAddress(e.target.value)}
              onFocus={() => address.length >= 3 && setShowSuggestions(true)}
              placeholder="Via, Piazza, Città..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAddress(s.display_name);
                    setLastSelectedAddress(s.display_name);
                    setShowSuggestions(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-indigo-50 transition-colors text-sm border-b border-gray-50 last:border-none flex items-start gap-3"
                >
                  <MapPin size={14} className="text-indigo-400 mt-1 shrink-0" />
                  <span className="line-clamp-2">{s.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between pl-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Orario & Promemoria</label>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {time && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold border border-blue-100">
                <Clock size={12} />
                {time}
                <button type="button" onClick={() => setTime('')} className="ml-1 hover:text-red-500"><X size={14} /></button>
              </div>
            )}
            {reminders.map((r, i) => (
              <div key={i} className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold border border-purple-100">
                <Bell size={12} />
                {r.value} {r.unit === 'minutes' ? 'min' : r.unit === 'hours' ? 'ore' : 'giorni'}
                <button type="button" onClick={() => removeReminder(i)} className="ml-1 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Time Input */}
            <div className="relative flex-1 min-w-[120px]">
              <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="time" 
                value={time} 
                onChange={e => {
                  setTime(e.target.value);
                  // Auto-blur after change to potentially close mobile picker
                  e.target.blur();
                }}
                className="w-full pl-10 pr-2 py-2 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-1 focus:ring-indigo-500 h-10"
              />
            </div>
            
            {/* Reminder Input Group */}
            <div className="flex flex-1 gap-2">
              <input 
                type="number" 
                value={newReminderValue} 
                onChange={e => setNewReminderValue(e.target.value)}
                className="w-16 px-3 py-2 bg-gray-50 border-none rounded-xl text-sm h-10"
                placeholder="N."
              />
              <select 
                value={newReminderUnit} 
                onChange={e => setNewReminderUnit(e.target.value as any)}
                className="flex-1 px-2 py-2 bg-gray-50 border-none rounded-xl text-sm h-10"
              >
                <option value="minutes">Min</option>
                <option value="hours">Ore</option>
                <option value="days">Gg</option>
              </select>
              <button 
                type="button" 
                onClick={addReminder}
                className="px-3 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-all font-black text-[10px] h-10 whitespace-nowrap"
              >
                ALERT
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] mt-4"
      >
        {isSubmitting ? 'Salvataggio...' : (initialData ? 'Aggiorna Appuntamento' : 'Salva Appuntamento')}
      </button>
    </form>
  );
}

interface NoteFormProps {
  onSave: (text: string) => Promise<void>;
  onCancel: () => void;
  initialData?: Transaction;
}

function NoteForm({ onSave, onCancel, initialData }: NoteFormProps) {
  const [text, setText] = useState(initialData?.note || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setIsSubmitting(true);
    await onSave(text.trim());
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
        <StickyNote size={16} /> 
        {initialData ? 'Modifica Nota' : 'Nuova Nota'}
      </h3>
      <textarea 
        value={text} 
        onChange={e => setText(e.target.value)}
        placeholder="Scrivi qualcosa qui..."
        rows={6}
        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 font-medium resize-none shadow-inner"
        autoFocus
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-100 transition-all active:scale-[0.98]"
      >
        {isSubmitting ? 'Salvataggio...' : (initialData ? 'Aggiorna Nota' : 'Salva Nota')}
      </button>
    </form>
  );
}
