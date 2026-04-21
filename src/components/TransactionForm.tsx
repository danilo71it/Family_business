import React, { useState } from 'react';
import { Plus, Minus, Calendar, Tag, FileText } from 'lucide-react';
import { TransactionType } from '../types';

interface Props {
  onAdd: (t: {
    amount: number;
    type: TransactionType;
    category: string;
    description: string;
    date: Date;
    userId: string;
  }) => Promise<void>;
  userId: string;
}

const CATEGORIES = [
  'Cibo', 'Casa', 'Trasporti', 'Svago', 'Salute', 'Istruzione', 'Stipendio', 'Regalo', 'Altro'
];

export function TransactionForm({ onAdd, userId }: Props) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;

    await onAdd({
      amount: parseFloat(amount),
      type,
      category,
      description,
      date: new Date(date),
      userId,
    });

    setAmount('');
    setDescription('');
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
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-mono text-lg"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 pl-1">Categoria</label>
          <div className="relative">
            <Tag size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none transition-all cursor-pointer"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 pl-1">Nota (opzionale)</label>
          <div className="relative">
            <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Aggiungi una nota..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md active:scale-[0.98]"
      >
        Aggiungi Transazione
      </button>
    </form>
  );
}
