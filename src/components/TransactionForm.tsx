import React, { useState, useEffect } from 'react';
import { Plus, Minus, Calendar, Tag, FileText, Repeat, AlertCircle, CheckCircle2 } from 'lucide-react';
import { TransactionType, RecurrenceFrequency } from '../types';
import { format } from 'date-fns';

interface Props {
  onAdd: (t: {
    amount: number;
    type: TransactionType;
    category: string;
    description: string;
    date: Date;
    userId: string;
    isEstimate: boolean;
    recurring: boolean;
    frequency?: RecurrenceFrequency;
    occurrenceCount?: number;
    reminderEnabled: boolean;
  }) => Promise<void>;
  userId: string;
  defaultDate?: Date | null;
}

const CATEGORIES = [
  'Cibo', 'Casa', 'Trasporti', 'Svago', 'Salute', 'Istruzione', 'Stipendio', 'Regalo', 'Altro'
];

export function TransactionForm({ onAdd, userId, defaultDate }: Props) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Update date if defaultDate changes
  useEffect(() => {
    if (defaultDate) {
      setDate(format(defaultDate, 'yyyy-MM-dd'));
    }
  }, [defaultDate]);

  // New states
  const [isEstimate, setIsEstimate] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [isInfinite, setIsInfinite] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [occurrenceCount, setOccurrenceCount] = useState('1');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) return;
    const parsedAmount = parseFloat(amount || '0');
    if (!isEstimate && (!amount || isNaN(parsedAmount))) return;

    // Create date and set to noon local to avoid timezone shifting
    const selectedDate = new Date(date);
    selectedDate.setHours(12, 0, 0, 0);

    await onAdd({
      amount: parsedAmount,
      type,
      category: category.trim(),
      description: '',
      date: selectedDate,
      userId,
      isEstimate,
      recurring,
      frequency: recurring ? frequency : undefined,
      occurrenceCount: recurring ? (isInfinite ? 60 : parseInt(occurrenceCount)) : undefined,
      reminderEnabled,
    });

    setAmount('');
    setCategory('');
    setRecurring(false);
    setIsInfinite(false);
    setIsEstimate(false);
    setReminderEnabled(false);
  };

  return (
    <form id="transaction-form" onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
            type === 'expense' ? 'bg-white shadow-sm text-red-600 font-medium' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Minus size={18} />
          Uscita
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
            type === 'income' ? 'bg-white shadow-sm text-green-600 font-medium' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Plus size={18} />
          Entrata
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 pl-1">Descrizione</label>
          <div className="relative">
            <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Esempio: Assicurazione Auto, Stipendio..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 pl-1">Importo</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium font-mono">€</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={isEstimate && !amount}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-mono text-lg disabled:opacity-50"
                required={!isEstimate}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 pl-1">Data</label>
            <div className="relative">
              <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Toggles */}
      <div className="flex flex-wrap gap-4 py-2 border-t border-gray-50 mt-2">
        <button
          type="button"
          onClick={() => setIsEstimate(!isEstimate)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            isEstimate ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
          }`}
        >
          {isEstimate ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {isEstimate ? 'Importo Presunto' : 'Importo Certo'}
        </button>

        <button
          type="button"
          onClick={() => setRecurring(!recurring)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            recurring ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
          }`}
        >
          <Repeat size={16} />
          {recurring ? 'Ricorrente' : 'Singola'}
        </button>

        <button
          type="button"
          onClick={() => setReminderEnabled(!reminderEnabled)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            reminderEnabled ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
          }`}
        >
          <AlertCircle size={16} />
          {reminderEnabled ? 'Alert attivo' : 'Senza Alert'}
        </button>
      </div>

      {recurring && (
        <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 pl-1">Frequenza</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="daily">Giornaliera</option>
                <option value="weekly">Settimanale</option>
                <option value="monthly">Mensile</option>
                <option value="yearly">Annuale</option>
              </select>
            </div>
            {!isInfinite && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 pl-1">Conteggio</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={occurrenceCount}
                  onChange={(e) => setOccurrenceCount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsInfinite(!isInfinite)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all w-fit ${
              isInfinite ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-300'
            }`}
          >
            {isInfinite ? <Repeat size={14} /> : <Plus size={14} />}
            {isInfinite ? 'Ripeti per sempre (max 5 anni)' : 'Imposta come infinito'}
          </button>
        </div>
      )}

      <button
        type="submit"
        className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md active:scale-[0.98]"
      >
        Aggiungi Transazione
      </button>
    </form>
  );
}
