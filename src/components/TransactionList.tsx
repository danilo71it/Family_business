import { Trash2, TrendingDown, TrendingUp, AlertCircle, Repeat, Pencil, Calendar as CalendarIcon, StickyNote } from 'lucide-react';
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
        <p className="text-gray-400 font-medium">Nessun dato registrato.</p>
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
            t.type === 'note' ? 'border-amber-100 bg-amber-50/10' : 
            t.type === 'appointment' ? 'border-blue-100 bg-blue-50/5' :
            t.isEstimate ? 'border-amber-100 bg-amber-50/10' : 'border-gray-100'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${
              t.type === 'income' ? 'bg-green-50 text-green-600' : 
              t.type === 'expense' ? 'bg-red-50 text-red-600' : 
              t.type === 'appointment' ? 'bg-blue-50 text-blue-600' :
              'bg-amber-50 text-amber-600'
            }`}>
              {t.type === 'appointment' ? <CalendarIcon size={20} /> : 
               t.type === 'note' ? <StickyNote size={20} /> :
               (t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-gray-900 truncate">
                  {t.type === 'note' ? 'Nota Testuale' : (t.category || t.note || 'Senza Titolo')}
                </h4>
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
              {t.type === 'note' && t.note && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-1 italic">{t.note}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <span className={`font-mono font-semibold text-lg hidden sm:inline ${
              t.type === 'income' ? 'text-green-600' : 
              t.type === 'appointment' ? 'text-blue-400' :
              t.type === 'note' ? 'text-amber-400' :
              (t.isEstimate || t.isUnknownAmount ? 'text-amber-600' : 'text-gray-900')
            }`}>
              {t.type === 'note' ? 'NOTA' :
               t.isUnknownAmount ? 'DA DEF' : 
               t.type === 'appointment' ? 'INFO' :
               (t.amount === 0 ? '---' : `${t.type === 'income' ? '+' : '-'}${Math.round(t.amount)}€`)}
            </span>
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(t); }}
                className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
              >
                <Pencil size={18} />
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
