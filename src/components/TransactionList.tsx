import { Trash2, TrendingDown, TrendingUp, AlertCircle, Repeat } from 'lucide-react';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => Promise<void>;
  onEdit?: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, onDelete, onEdit }: Props) {
  if (transactions.length === 0) {
    return (
      <div id="no-transactions" className="text-center py-12 px-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <p className="text-gray-400 font-medium">Nessuna transazione registrata.</p>
      </div>
    );
  }

  return (
    <div id="transaction-list" className="space-y-3">
      {transactions.map((t) => (
        <div
          key={t.id}
          onClick={() => onEdit?.(t)}
          className={`group flex items-center justify-between p-4 bg-white rounded-xl border transition-all hover:shadow-sm cursor-pointer ${
            t.isEstimate ? 'border-amber-100 bg-amber-50/10' : 'border-gray-100'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-gray-900">{t.category}</h4>
                {t.recurring && <Repeat size={14} className="text-blue-500" />}
                {t.isEstimate && (
                  <span className="text-[10px] font-semibold uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded leading-none">
                    Variabile
                  </span>
                )}
                {t.description && <span className="text-sm text-gray-400 font-normal hidden sm:inline">• {t.description}</span>}
              </div>
              <p className="text-xs text-gray-400 uppercase tracking-tighter font-medium">
                {format(t.date, 'dd MMMM yyyy', { locale: it })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <span className={`font-mono font-semibold text-lg ${t.type === 'income' ? 'text-green-600' : (t.isEstimate || t.isUnknownAmount ? 'text-amber-600' : 'text-gray-900')}`}>
              {t.isUnknownAmount ? (t.description || t.category || 'DA DEFINIRE') : (t.amount === 0 ? '---' : `${t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}`)}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(t); }}
                className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
              >
                <Repeat size={18} className="rotate-90" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
