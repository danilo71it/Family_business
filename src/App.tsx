import React, { useState, useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import { useFinance } from './hooks/useFinance';
import { Auth } from './components/Auth';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { Stats } from './components/Stats';
import { CalendarView } from './components/CalendarView';
import { ShiftConfig } from './components/ShiftConfig';
import { ShiftLegend } from './components/ShiftLegend';
import { DailyPanel } from './components/DailyPanel';
import { PushNotificationManager } from './components/PushNotificationManager';
import { useWorkShifts } from './hooks/useWorkShifts';
import { getShiftForDay } from './lib/shiftUtils';
import { LogOut, Plus, Users, Wallet, Loader2, LayoutGrid, Calendar as CalendarIcon, Bell, X, Trash2, AlertCircle as AlertIcon, Clock, Settings, RefreshCw } from 'lucide-react';
import { ViewMode, Transaction, WorkShift, ShiftCycle } from './types';
import { isAfter, isToday, addDays, format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';

export default function App() {
  const { user, profile, loading: authLoading, login, logout, updateProfile } = useAuth();

  // Cleanup: if profile has a groupId with spaces, trim it and update DB once
  React.useEffect(() => {
    if (profile?.groupId && (profile.groupId.startsWith(' ') || profile.groupId.endsWith(' '))) {
      console.log('Cleaning up malformed groupId...');
      updateProfile({ groupId: profile.groupId.trim() });
    }
  }, [profile, updateProfile]);
  const { 
    transactions, group, loading: financeLoading, 
    addTransaction, deleteTransaction, deleteTransactionSeries, updateTransaction, 
    resetMonthTransactions, resetAllTransactions, createGroup 
  } = useFinance(profile?.groupId || null);

  const {
    shifts, cycle, overrides, saveShift, deleteShift, saveCycle, saveOverride, resetWorkShifts
  } = useWorkShifts(profile?.groupId || null);

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [isShiftConfigOpen, setIsShiftConfigOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [summaryMonth, setSummaryMonth] = useState(new Date());
  const [groupName, setGroupName] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [resetConfig, setResetConfig] = useState<{ step: number; type: 'month' | 'all' | null }>({ step: 0, type: null });

  const handleReset = async () => {
    if (resetConfig.step === 0) {
      setResetConfig({ step: 1, type: null });
      return;
    }
    
    if (resetConfig.step === 1) return; // Wait for type selection

    if (resetConfig.type === 'month') {
      if (resetConfig.step === 2) {
        await resetMonthTransactions(summaryMonth);
        setResetConfig({ step: 0, type: null });
      } else {
        setResetConfig(prev => ({ ...prev, step: 2 }));
      }
    } else if (resetConfig.type === 'all') {
      if (resetConfig.step === 2) {
        await resetAllTransactions();
        setResetConfig({ step: 0, type: null });
      } else {
        setResetConfig(prev => ({ ...prev, step: 2 }));
      }
    }
  };

  const scrollToForm = () => {
    const form = document.querySelector('#transaction-form-container');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const alerts = useMemo(() => {
    return transactions
      .filter(t => 
        (isAfter(t.date, new Date()) || isToday(t.date)) &&
        t.date.getMonth() === summaryMonth.getMonth() && 
        t.date.getFullYear() === summaryMonth.getFullYear()
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [transactions, summaryMonth]);

  const filteredTransactionsByMonth = useMemo(() => {
    return transactions.filter(t => 
      t.date.getMonth() === summaryMonth.getMonth() && 
      t.date.getFullYear() === summaryMonth.getFullYear()
    );
  }, [transactions, summaryMonth]);

  const filteredTransactionsByDate = useMemo(() => {
    if (!selectedDate) return transactions;
    return transactions.filter(t => isSameDay(t.date, selectedDate));
  }, [transactions, selectedDate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={login} />;
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    const gid = await createGroup(groupName, user.uid);
    await updateProfile({ groupId: gid });
  };

  if (!profile?.groupId) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl mb-2">
              <Users size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Unisciti alla Famiglia</h2>
            <p className="text-gray-500">Per iniziare a tracciare le spese, crea un gruppo famigliare.</p>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-4">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nome del gruppo (es: Famiglia Rossi)"
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              required
            />
            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
            >
              Crea Gruppo
            </button>
          </form>
          
          <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
            Potrai invitare altri membri in seguito
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm px-2 sm:px-6 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center shrink-0">
            <div className="flex flex-col select-none">
              <span className="font-serif text-3xl sm:text-4xl text-brand-blue tracking-tight leading-none">Family</span>
              <span className="text-[8px] sm:text-[10px] font-sans font-medium text-gray-950 uppercase tracking-[0.54em] ml-[3px] -mt-[2px] opacity-90">BUSINESS</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
            {/* View Toggle */}
            <div className="bg-gray-100 p-1 rounded-xl flex gap-1 shrink-0">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-sm font-bold transition-all ${
                  viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CalendarIcon size={14} className="sm:size-4" />
                <span className="hidden sm:inline">Calendario</span>
                <span className="sm:hidden uppercase tracking-widest">CAL</span>
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-sm font-bold transition-all ${
                  viewMode === 'summary' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid size={14} className="sm:size-4" />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">STATISTICHE</span>
                <span className="sm:hidden uppercase tracking-widest">STAT</span>
              </button>
            </div>

            <button
               onClick={() => setIsShiftConfigOpen(true)}
               className="p-2 border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-2"
               title="Configura Turni"
            >
              <Clock size={20} />
              <span className="hidden sm:inline text-xs font-bold">Turni</span>
            </button>

            <button
               onClick={() => setIsSettingsOpen(true)}
               className="p-2 border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
               title="Strumenti"
            >
              <Settings size={20} />
            </button>

            <div className="hidden md:flex items-center gap-2 pr-4 border-r border-gray-100 ml-2">
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-gray-100" referrerPolicy="no-referrer" alt="" />
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {viewMode === 'summary' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight capitalize">
                STATISTICHE - {format(summaryMonth, 'MMMM yyyy', { locale: it })}
              </h2>
            </div>
            <Stats transactions={filteredTransactionsByMonth} />
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Registro Transazioni</h2>
              <TransactionList transactions={filteredTransactionsByMonth} onDelete={deleteTransaction} onEdit={(t) => { setEditingTransaction(t); setSelectedDate(t.date); setViewMode('calendar'); }} />
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="space-y-4">
              <CalendarView 
                transactions={transactions} 
                shifts={shifts}
                cycle={cycle}
                overrides={overrides}
                selectedDate={selectedDate}
                initialMonth={summaryMonth}
                onMonthChange={(date) => setSummaryMonth(date)}
                onEditTransaction={(t) => {
                  setEditingTransaction(t);
                  setSelectedDate(t.date);
                }}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                }} 
              />
              <ShiftLegend shifts={shifts} cycle={cycle} overrides={overrides} />
            </div>

            {selectedDate && (
              <DailyPanel 
                date={selectedDate}
                transactions={transactions}
                shifts={shifts}
                cycle={cycle}
                overrides={overrides}
                userId={user.uid}
                onAddTransaction={addTransaction}
                onUpdateTransaction={updateTransaction}
                onDeleteTransaction={deleteTransaction}
                onSaveShiftOverride={saveOverride}
                onClose={() => {
                  setSelectedDate(null);
                  setEditingTransaction(null);
                }}
              />
            )}
          </div>
        )}
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Strumenti</h2>
                <p className="text-xs text-gray-500">Gestione e manutenzione dati</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <PushNotificationManager userId={user?.uid} />
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Azzeramento Dati</h3>
                
                <button 
                  onClick={async () => {
                    if (window.confirm(`Sei sicuro di voler eliminare TUTTE le transazioni di ${format(summaryMonth, 'MMMM yyyy', { locale: it })}?`)) {
                      await resetMonthTransactions(summaryMonth);
                      setIsSettingsOpen(false);
                    }
                  }}
                  className="w-full p-4 bg-gray-50 hover:bg-amber-50 text-amber-600 rounded-2xl border border-gray-100 hover:border-amber-200 transition-all flex items-center gap-4 text-left"
                >
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Azzera mese corrente</p>
                    <p className="text-[10px] font-medium opacity-60">Elimina le spese di questo mese</p>
                  </div>
                </button>

                <button 
                  onClick={async () => {
                    if (window.confirm('ATTENZIONE: Sei sicuro di voler eliminare TUTTE le transazioni mai inserite? L\'azione è irreversibile.')) {
                      await resetAllTransactions();
                      setIsSettingsOpen(false);
                    }
                  }}
                  className="w-full p-4 bg-gray-50 hover:bg-red-50 text-red-600 rounded-2xl border border-gray-100 hover:border-red-200 transition-all flex items-center gap-4 text-left"
                >
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <AlertIcon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Azzera tutto lo storico</p>
                    <p className="text-[10px] font-medium opacity-60">Elimina ogni transazione inserita</p>
                  </div>
                </button>

                <button 
                  onClick={async () => {
                    if (window.confirm('Vuoi azzerare la configurazione dei turni? I tipi di turno rimarranno, ma verranno cancellati il ciclo e tutti i cambi manuali.')) {
                      await resetWorkShifts();
                      setIsSettingsOpen(false);
                    }
                  }}
                  className="w-full p-4 bg-gray-50 hover:bg-purple-50 text-purple-600 rounded-2xl border border-gray-100 hover:border-purple-200 transition-all flex items-center gap-4 text-left"
                >
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Azzera dati turni</p>
                    <p className="text-[10px] font-medium opacity-60">Resetta cicli e cambi manuali</p>
                  </div>
                </button>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase font-mono">Gruppo: {profile?.groupId}</p>
            </div>
          </div>
        </div>
      )}

      {isShiftConfigOpen && (
        <ShiftConfig 
          shifts={shifts}
          cycle={cycle}
          onSaveShift={saveShift}
          onDeleteShift={deleteShift}
          onSaveCycle={saveCycle}
          onClose={() => setIsShiftConfigOpen(false)}
        />
      )}
    </div>
  );
}
