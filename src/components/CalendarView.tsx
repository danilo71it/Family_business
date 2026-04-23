import React, { useState } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  addDays, isToday
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { Transaction, WorkShift, ShiftCycle, ShiftOverride } from '../types';
import { getShiftForDay } from '../lib/shiftUtils';
import { isHoliday } from '../lib/holidayUtils';

interface Props {
  transactions: Transaction[];
  shifts?: WorkShift[];
  cycle?: ShiftCycle | null;
  overrides?: ShiftOverride[];
  onSelectDate: (date: Date) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onMonthChange?: (date: Date) => void;
  initialMonth?: Date;
  selectedDate?: Date | null;
}

export function CalendarView({ 
  transactions, shifts = [], cycle, overrides = [], 
  onSelectDate, onEditTransaction, onMonthChange, initialMonth, selectedDate 
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => {
    const next = addMonths(currentMonth, 1);
    setCurrentMonth(next);
    onMonthChange?.(next);
  };

  const prevMonth = () => {
    const prev = subMonths(currentMonth, 1);
    setCurrentMonth(prev);
    onMonthChange?.(prev);
  };

  const resetMonth = () => {
    const now = new Date();
    setCurrentMonth(now);
    onMonthChange?.(now);
  };

  const getDayTransactions = (day: Date) => {
    return transactions.filter(t => isSameDay(t.date, day));
  };

  return (
    <div id="calendar-view" className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-50">
        <h2 className="text-xl font-semibold text-gray-900 tracking-tighter capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <ChevronLeft size={20} />
          </button>
          <button onClick={resetMonth} className="px-3 py-1 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
            Oggi
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-50">
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
          <div key={day} className="py-3 text-center text-[10px] font-semibold uppercase tracking-tight text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const dayTransactions = getDayTransactions(day);
          const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
          const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const holiday = isHoliday(day);

          // Get variables/estimates or privacy items or unknown amounts
          const individualTxs = dayTransactions.filter(t => t.recurring || t.isEstimate || t.isPrivacyActive || t.isUnknownAmount);
          const otherTxs = dayTransactions.filter(t => !t.recurring && !t.isEstimate && !t.isPrivacyActive && !t.isUnknownAmount);
          
          const incomeSum = otherTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
          const expenseSum = otherTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`min-h-[100px] p-2 border-r border-b border-gray-50 transition-all cursor-pointer hover:bg-blue-50/30 group relative ${
                !isCurrentMonth ? 'bg-gray-50/30' : ''
              } ${idx % 7 === 6 ? 'border-r-0' : ''} ${
                selectedDate && isSameDay(day, selectedDate) ? 'bg-blue-50 border-2 border-blue-200 shadow-inner' : ''
              }`}
            >
              {/* Shift background Layer */}
              {(() => {
                const shift = getShiftForDay(day, shifts, cycle, overrides);
                if (!shift) return null;
                return (
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-[0.1]" 
                    style={{ backgroundColor: shift.color }}
                  />
                );
              })()}

              <div className="flex justify-between items-start mb-1 relative z-10">
                <div className="flex flex-col items-start gap-1">
                  <span className={`text-sm font-semibold ${
                    isToday(day) ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full shadow-lg shadow-blue-200' : 
                    isCurrentMonth ? (holiday ? 'text-red-500' : 'text-gray-900') : 'text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {holiday && (
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter leading-none">
                      FESTIVO
                    </span>
                  )}
                </div>

                {/* Shift Indicator Letter */}
                {(() => {
                  const shift = getShiftForDay(day, shifts, cycle, overrides);
                  if (!shift) return null;
                  return (
                    <span 
                      className="text-[10px] font-black px-1.5 py-1 rounded leading-none"
                      style={{ color: shift.color }}
                    >
                      {shift.name}
                    </span>
                  );
                })()}
              </div>

              <div className="space-y-1 relative z-10">
                {/* Individual transactions (recurring, variable or privacy) */}
                {individualTxs.map(t => (
                  <div 
                    key={t.id} 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTransaction?.(t);
                    }}
                    className={`text-[10px] font-semibold tracking-tighter truncate px-1.5 py-0.5 rounded transition-transform active:scale-95 hover:brightness-95 uppercase ${
                      t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    } ${t.isEstimate || t.isUnknownAmount ? 'opacity-70 border border-dashed border-current' : ''}`}
                    title={t.isUnknownAmount ? (t.description || t.category || "Importo da definire") : t.category}
                  >
                    {t.isUnknownAmount ? (t.description || t.category || 'DA DEFINIRE') : (t.isPrivacyActive || t.isEstimate ? t.category : t.amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }))}
                  </div>
                ))}

                {/* Sums for non-recurring/certain transactions */}
                <div className="space-y-0.5 uppercase">
                  {incomeSum > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      <TrendingUp size={10} />
                      {incomeSum.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </div>
                  )}
                  {expenseSum > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      <TrendingDown size={10} />
                      {expenseSum.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </div>
                  )}
                </div>
                
                {/* Visual indicator for alerts REMOVED as requested */}
                <div className="flex gap-1 mt-1">
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
