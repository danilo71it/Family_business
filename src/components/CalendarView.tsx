import React, { useState } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  isToday
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Bell, Calendar as CalendarIcon, Check } from 'lucide-react';
import { Transaction, WorkShift, ShiftCycle, ShiftOverride } from '../types';
import { getShiftForDay } from '../lib/shiftUtils';
import { isHoliday } from '../lib/holidayUtils';
import { motion, AnimatePresence } from 'motion/react';

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
  const [direction, setDirection] = useState(0);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => {
    setDirection(1);
    const next = addMonths(currentMonth, 1);
    setCurrentMonth(next);
    onMonthChange?.(next);
  };

  const prevMonth = () => {
    setDirection(-1);
    const prev = subMonths(currentMonth, 1);
    setCurrentMonth(prev);
    onMonthChange?.(prev);
  };

  const resetMonth = () => {
    const now = new Date();
    setDirection(now > currentMonth ? 1 : -1);
    setCurrentMonth(now);
    onMonthChange?.(now);
  };

  const selectYear = (year: number) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(year);
    setDirection(year > currentMonth.getFullYear() ? 1 : -1);
    setCurrentMonth(newDate);
    onMonthChange?.(newDate);
    setIsYearPickerOpen(false);
  };

  const getDayTransactions = (day: Date) => {
    return transactions.filter(t => isSameDay(t.date, day));
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

  return (
    <div id="calendar-view" className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 sm:p-8 border-b border-gray-50 bg-white sticky top-0 z-10">
        <div className="flex items-baseline gap-1.5 sm:gap-2 group cursor-pointer" onClick={() => setIsYearPickerOpen(true)}>
          <h2 className="text-2xl sm:text-3xl font-serif text-brand-blue tracking-tight capitalize leading-none transition-colors group-hover:text-blue-700">
            {format(currentMonth, 'MMMM', { locale: it })}
          </h2>
          <span className="text-base sm:text-xl font-sans font-medium text-gray-400 tracking-tight flex items-center gap-1 group-hover:text-gray-600 transition-colors">
            {format(currentMonth, 'yyyy', { locale: it })}
          </span>
        </div>
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

      {/* Year Picker Modal */}
      <AnimatePresence>
        {isYearPickerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={() => setIsYearPickerOpen(false)}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-all"
            >
              <ChevronRight size={24} className="rotate-90" />
            </button>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">Seleziona Anno</h3>
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => selectYear(year)}
                  className={`py-4 rounded-2xl text-xl font-bold transition-all border ${
                    year === currentMonth.getFullYear() 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
                      : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative overflow-hidden">
        {/* Weekdays Header */}
        <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-50 relative z-0">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-semibold uppercase tracking-tight text-gray-400">
              {day}
            </div>
          ))}
        </div>

        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentMonth.toISOString()}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="grid grid-cols-7 w-full h-full"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) * velocity.x;
              if (swipe < -10000) {
                nextMonth();
              } else if (swipe > 10000) {
                prevMonth();
              }
            }}
          >
            {calendarDays.map((day, idx) => {
              const dayTransactions = getDayTransactions(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const holiday = isHoliday(day);

              const individualTxs = dayTransactions.filter(t => t.recurring || t.isEstimate || t.isPrivacyActive || t.isUnknownAmount);
              const otherTxs = dayTransactions.filter(t => !t.recurring && !t.isEstimate && !t.isPrivacyActive && !t.isUnknownAmount);
              
              const incomeSum = otherTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
              const expenseSum = otherTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onSelectDate(day)}
                  className={`min-h-[100px] p-2 border-r border-b border-gray-50 transition-all cursor-pointer hover:bg-blue-50/30 group relative ${
                    !isCurrentMonth ? 'bg-gray-100/30' : ''
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
                      <span className={`text-sm font-semibold rounded-full w-7 h-7 flex items-center justify-center transition-all ${
                        isToday(day) ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 
                        isCurrentMonth ? (holiday ? 'text-red-500' : 'text-gray-900') : 'text-gray-300'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {holiday && (
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter leading-none">
                          FEST
                        </span>
                      )}
                    </div>

                    {/* Shift Indicator Letter */}
                    {(() => {
                      const shift = getShiftForDay(day, shifts, cycle, overrides);
                      if (!shift) return null;
                      return (
                        <span 
                          className="text-[10px] font-black px-1.5 py-1 rounded leading-none backdrop-blur-[2px]"
                          style={{ color: shift.color, backgroundColor: `${shift.color}15` }}
                        >
                          {shift.name}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="space-y-1 relative z-10">
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
                      >
                        {t.isUnknownAmount ? (t.description || t.category || 'DA DEF') : (t.isPrivacyActive || t.isEstimate ? t.category : t.amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }))}
                      </div>
                    ))}

                    <div className="space-y-0.5 uppercase">
                      {incomeSum > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                          <TrendingUp size={10} />
                          {incomeSum.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                        </div>
                      )}
                      {expenseSum > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                          <TrendingDown size={10} />
                          {expenseSum.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
