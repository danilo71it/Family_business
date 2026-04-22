import React, { useState, useEffect } from 'react';
import { Plus, Minus, Calendar, FileText, Repeat, AlertCircle, Bell } from 'lucide-react';
import { Transaction, TransactionType, RecurrenceFrequency } from '../types';
import { format } from 'date-fns';

interface Props {
  onAdd: (t: any) => Promise<void>;
  onUpdate?: (id: string, t: any) => Promise<void>;
  userId: string;
  defaultDate?: Date | null;
  initialData?: Transaction | null;
}

export function TransactionForm({ onAdd, onUpdate, userId, defaultDate, initialData }: Props) {
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [category, setCategory] = useState(initialData?.category || '');
  const [date, setDate] = useState(initialData ? format(initialData.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  
  // Update state when initialData or defaultDate changes
  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setCategory(initialData.category);
      setDate(format(initialData.date, 'yyyy-MM-dd'));
      setIsEstimate(initialData.isEstimate || false);
      setRecurring(initialData.recurring || false);
      setFrequency(initialData.frequency || 'monthly');
      setOccurrenceCount(initialData.occurrenceCount?.toString() || '1');
      setReminderEnabled(initialData.reminderEnabled ?? true);
      setIsInfinite(initialData.occurrenceCount === 60);
    } else if (defaultDate) {
      setDate(format(defaultDate, 'yyyy-MM-dd'));
    }
  }, [defaultDate, initialData]);

  // States
  const [isEstimate, setIsEstimate] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [isInfinite, setIsInfinite] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [occurrenceCount, setOccurrenceCount] = useState('1');
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) return;
    const parsedAmount = parseFloat(amount || '0');
    if (!isEstimate && (!amount || isNaN(parsedAmount))) return;

    const selectedDate = new Date(date);
    selectedDate.setHours(12, 0, 0, 0);

    const data = {
      amount: parsedAmount,
      type,
      category: category.trim(),
      description: '',
      date: selectedDate,
      userId,
      isEstimate: recurring ? isEstimate : false,
      recurring,
      frequency: recurring ? frequency : undefined,
      occurrenceCount: recurring ? (isInfinite ? 60 : parseInt(occurrenceCount)) : undefined,
      reminderEnabled,
    };

    // If we are editing a "variable" transaction and provide an amount > 0, 
    // it's no longer variable/estimate
    if (initialData?.isEstimate && parsedAmount > 0) {
      data.isEstimate = false;
    }

    if (initialData && onUpdate) {
      await onUpdate(initialData.id, data);
    } else {
      await onAdd(data);
    }

    if (!initialData) {
      setAmount('');
      setCategory('');
      setRecurring(false);
      setIsInfinite(false);
      setIsEstimate(false);
      setReminderEnabled(true);
    }
  };

  return (
    <form id={initialData ? "edit-transaction-form" : "transaction-form"} onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
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
                disabled={recurring && isEstimate && !amount}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-mono text-lg disabled:opacity-50"
                required={!(recurring && isEstimate)}
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

      <div className="space-y-4 pt-2 border-t border-gray-50">
        <div className="flex flex-wrap gap-2">
          {/* Recurring Toggle Button */}
          <button
            type="button"
            onClick={() => setRecurring(!recurring)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              recurring ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            <Repeat size={14} />
            Transazione Ricorrente
          </button>

          {/* Conditional Estimate Toggle Button - Only shown if recurring is ON */}
          {recurring && (
            <button
              type="button"
              onClick={() => setIsEstimate(!isEstimate)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border animate-in fade-in zoom-in-95 duration-200 ${
                isEstimate ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              <AlertCircle size={14} />
              Importo Variabile
            </button>
          )}

          {/* Alert Toggle Button - Defaulted to ON */}
          <button
            type="button"
            onClick={() => setReminderEnabled(!reminderEnabled)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              reminderEnabled ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            <Bell size={14} />
            Alert
          </button>
        </div>
      </div>

      {recurring && (
        <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-xl animate-in fade-in slide-in-from-top-2">
          {initialData?.parentTransactionId && initialData.recurring && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm('Vuoi interrompere la serie ricorrente? Le transazioni future verranno eliminate.')) {
                  await onUpdate?.(initialData.id, { recurring: false });
                }
              }}
              className="w-full py-2 bg-white border border-red-200 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-50 mb-2 transition-all"
            >
              Interrompi Serie Ricorrente
            </button>
          )}
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
        className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] ${
          type === 'income' ? 'bg-green-600 shadow-green-100 hover:bg-green-700' : 'bg-red-600 shadow-red-100 hover:bg-red-700'
        }`}
      >
        {initialData ? 'Aggiorna Transazione' : (type === 'income' ? 'Salva Entrata' : 'Salva Uscita')}
      </button>
    </form>
  );
}
