import React, { useState } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  addDays, isToday
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
  onSelectDate: (date: Date) => void;
}

export function CalendarView({ transactions, onSelectDate }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getDayTransactions = (day: Date) => {
    return transactions.filter(t => isSameDay(t.date, day));
  };

  return (
    <div id="calendar-view" className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-50">
        <h2 className="text-xl font-black text-gray-900 tracking-tight capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
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
          <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
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

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`min-h-[100px] p-2 border-r border-b border-gray-50 transition-all cursor-pointer hover:bg-blue-50/30 group ${
                !isCurrentMonth ? 'bg-gray-50/30' : ''
              } ${idx % 7 === 6 ? 'border-r-0' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-bold ${
                  isToday(day) ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full shadow-lg shadow-blue-200' : 
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-300'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>

              <div className="space-y-1">
                {income > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                    <TrendingUp size={10} />
                    {income.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                  </div>
                )}
                {expense > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                    <TrendingDown size={10} />
                    {expense.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                  </div>
                )}
                
                {/* Visual indicator for estimates or recurring */}
                <div className="flex gap-1 mt-1">
                  {dayTransactions.some(t => t.isEstimate) && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Contiene stime" />}
                  {dayTransactions.some(t => t.reminderEnabled) && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" title="Contiene alert" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
