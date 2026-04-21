import { Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => Promise<void>;
}

export function TransactionList({ transactions, onDelete }: Props) {
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
          className="group flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">{t.category}</h4>
                {t.description && <span className="text-sm text-gray-400 font-normal">• {t.description}</span>}
              </div>
              <p className="text-xs text-gray-400 uppercase tracking-tighter font-medium">
                {format(t.date, 'dd MMMM yyyy', { locale: it })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className={`font-mono font-bold text-lg ${t.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
              {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
            </span>
            <button
              onClick={() => onDelete(t.id)}
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
