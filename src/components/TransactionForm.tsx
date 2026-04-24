import React, { useState, useEffect } from 'react';
import { Plus, Minus, Calendar, FileText, Repeat, AlertCircle, Bell, Trash2, Eye, EyeOff, StickyNote } from 'lucide-react';
import { Transaction, TransactionType, RecurrenceFrequency } from '../types';
import { format } from 'date-fns';

interface Props {
  onAdd: (t: any) => Promise<void>;
  onUpdate?: (id: string, t: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onDeleteSeries?: (parentTransactionId: string) => Promise<void>;
  userId: string;
  defaultDate?: Date | null;
  initialData?: Transaction | null;
}

export function TransactionForm({ onAdd, onUpdate, onDelete, onDeleteSeries, userId, defaultDate, initialData }: Props) {
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [category, setCategory] = useState(initialData?.category || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [date, setDate] = useState(initialData ? format(initialData.date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  
  // Update state when initialData or defaultDate changes
  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setCategory(initialData.category);
      setNote(initialData.note || '');
      setDate(format(initialData.date, 'yyyy-MM-dd'));
      setIsEstimate(initialData.isEstimate || false);
      setRecurring(initialData.recurring || false);
      setFrequency(initialData.frequency || 'monthly');
      setOccurrenceCount(initialData.occurrenceCount?.toString() || '1');
      setReminderEnabled(initialData.reminderEnabled ?? true);
      setIsInfinite(initialData.occurrenceCount === 60);
      setIsPrivacyActive(initialData.isPrivacyActive || false);
      setIsUnknownAmount(initialData.isUnknownAmount || false);
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
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);
  const [isUnknownAmount, setIsUnknownAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!initialData || !onDelete || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (initialData.recurring && initialData.parentTransactionId) {
        if (window.confirm('Questa è una transazione ricorrente. Vuoi cancellare l\'intera serie (passata e futura) o solo questa singola occorrenza? Clicca OK per cancellare TUTTA LA SERIE, Annulla per cancellare SOLO QUESTA.')) {
          if (onDeleteSeries) {
            await onDeleteSeries(initialData.parentTransactionId);
          } else {
            await onDelete(initialData.id);
          }
        } else {
          if (window.confirm('Confermi di voler cancellare questa singola occorrenza?')) {
            await onDelete(initialData.id);
          }
        }
      } else {
        if (window.confirm('Confermi di voler cancellare questa transazione?')) {
          await onDelete(initialData.id);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    // We allow saving if either category or note is filled
    if (!category.trim() && !note.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Handle amount parsing more robustly
      let parsedAmount = 0;
      let actualType = type;

      if (!isUnknownAmount) {
        const amountStr = amount.replace(',', '.');
        parsedAmount = parseFloat(amountStr);
        if (isNaN(parsedAmount)) parsedAmount = 0;
      }

      // Determine if it's an appointment (neutral)
      // Conditions for appointment:
      // 1. Amount is empty or 0 AND isUnknownAmount is false
      // 2. Or if explicitly decided (but here we follow original user logic of automatic detection)
      const isActuallyZero = !amount || parseFloat(amount.replace(',', '.')) === 0;
      if (!isUnknownAmount && isActuallyZero) {
        actualType = 'appointment';
      }

      const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      alert('Data non valida.');
      setIsSubmitting(false);
      return;
    }
    selectedDate.setHours(12, 0, 0, 0);

    const data: any = {
      amount: parsedAmount,
      type: actualType,
      category: category.trim() || (note.trim() ? '' : 'Nota'), // If only note, category remains empty or generic
      description: '',
      note: note.trim(),
      date: selectedDate,
      userId,
      isEstimate: !!(recurring ? isEstimate : false),
      isUnknownAmount: !!isUnknownAmount,
      isPrivacyActive: !!isPrivacyActive,
      recurring: !!recurring,
      frequency: recurring ? (frequency || 'monthly') : null,
      occurrenceCount: recurring ? (isInfinite ? 60 : (parseInt(occurrenceCount) || 1)) : null,
      reminderEnabled: !!reminderEnabled,
    };

    // If we are editing a "variable" transaction and provide an amount > 0, 
    // it's no longer variable/estimate
    if (initialData?.isEstimate && parsedAmount > 0) {
      data.isEstimate = false;
    }

    if (initialData && onUpdate) {
      // Logic for shifting future recurring dates
      const originalDateStr = format(initialData.date, 'yyyy-MM-dd');
      if (initialData.recurring && initialData.parentTransactionId && originalDateStr !== date) {
        if (window.confirm('Hai modificato la data di una transazione ricorrente. Vuoi spostare di conseguenza anche tutte le date successive della serie?')) {
          data.shiftFutureDates = true;
          data.originalDate = initialData.date;
        }
      }
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
    } catch (err: any) {
      console.error(err);
      alert(`Errore durante il salvataggio: ${err.message || 'Riprova'}`);
    } finally {
      setIsSubmitting(false);
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
              onFocus={(e) => e.target.select()}
              placeholder="Descrizione o Appuntamento"
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 pl-1">Importo</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium font-mono">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={isUnknownAmount ? '' : amount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  // Allow only numbers and one dot
                  if (/^[0-9]*\.?[0-9]*$/.test(val) || val === '') {
                    setAmount(e.target.value);
                    if (e.target.value) setIsUnknownAmount(false);
                  }
                }}
                placeholder={isUnknownAmount ? "SCONOSCIUTO" : (isEstimate ? "STIMA" : "0.00")}
                disabled={isUnknownAmount}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-mono text-lg disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2 border-t border-gray-50">
        <div className="flex flex-wrap gap-2">
          {/* Privacy Toggle Button */}
          <button
            type="button"
            onClick={() => setIsPrivacyActive(!isPrivacyActive)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              isPrivacyActive ? 'bg-gray-800 border-gray-800 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            {isPrivacyActive ? <EyeOff size={14} /> : <Eye size={14} />}
            Privacy
          </button>

          {/* Unknown Amount Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setIsUnknownAmount(!isUnknownAmount);
              if (!isUnknownAmount) {
                setAmount('');
                setIsEstimate(true); // Unknown is technically variable
              }
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              isUnknownAmount ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            <AlertCircle size={14} />
            Importo Sconosciuto
          </button>

          {/* Remind Toggle Button - Defaulted to OFF */}
          <button
            type="button"
            onClick={() => setReminderEnabled(!reminderEnabled)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              reminderEnabled ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            <Bell size={14} />
            Remind
          </button>

          {/* Recurring Toggle Button - Moved to last */}
          <button
            type="button"
            onClick={() => setRecurring(!recurring)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
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
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border animate-in fade-in zoom-in-95 duration-200 ${
                isEstimate ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              <AlertCircle size={14} />
              Importo Variabile
            </button>
          )}
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
                  onFocus={(e) => e.target.select()}
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

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 pl-1">Note</label>
        <div className="relative">
          <StickyNote size={18} className="absolute left-4 top-3 text-gray-400" />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Aggiungi appunti per questo giorno..."
            rows={3}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex-1 py-4 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
            type === 'income' ? 'bg-green-600 shadow-green-100 hover:bg-green-700' : 'bg-red-600 shadow-red-100 hover:bg-red-700'
          }`}
        >
          {isSubmitting ? 'Salvataggio...' : (initialData ? 'Aggiorna' : (type === 'income' ? 'Salva Entrata' : 'Salva Uscita'))}
        </button>
        
        {initialData && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-4 bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-gray-100"
            title="Elimina"
          >
            <Trash2 size={24} />
          </button>
        )}
      </div>
    </form>
  );
}
