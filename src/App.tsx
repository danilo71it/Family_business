import React, { useState, useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import { useFinance } from './hooks/useFinance';
import { Auth } from './components/Auth';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { Stats } from './components/Stats';
import { CalendarView } from './components/CalendarView';
import { LogOut, Plus, Users, Wallet, Loader2, LayoutGrid, Calendar as CalendarIcon, Bell, X, Trash2, AlertCircle as AlertIcon } from 'lucide-react';
import { ViewMode, Transaction } from './types';
import { isAfter, isToday, addDays, format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';

export default function App() {
  const { user, profile, loading: authLoading, login, logout, updateProfile } = useAuth();
  const { 
    transactions, group, loading: financeLoading, 
    addTransaction, deleteTransaction, deleteTransactionSeries, updateTransaction, 
    resetMonthTransactions, resetAllTransactions, createGroup 
  } = useFinance(profile?.groupId || null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
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
        t.reminderEnabled && 
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
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">Family business</h1>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{group?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CalendarIcon size={16} />
                Calendario
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  viewMode === 'summary' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid size={16} />
                Riepilogo
              </button>
            </div>

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
        {/* Alerts Section (if any) */}
        {alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-4 overflow-x-auto no-scrollbar">
            <div className="p-3 bg-white rounded-xl shadow-sm text-amber-500 h-fit">
              <Bell size={20} />
            </div>
            <div className="flex gap-4">
              {alerts.map(alert => (
                <div key={alert.id} className="min-w-[200px] bg-white/50 p-3 rounded-xl border border-white/50">
                  <p className="text-[10px] font-black uppercase text-amber-600">Scadenza {format(alert.date, 'dd MMM', { locale: it })}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{alert.category}</p>
                  <p className="text-xs font-mono font-bold text-gray-500">
                    {alert.amount === 0 ? 'Da definire' : alert.amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'summary' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight capitalize">
                Riepilogo - {format(summaryMonth, 'MMMM yyyy', { locale: it })}
              </h2>
            </div>
            <Stats transactions={filteredTransactionsByMonth} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-12 space-y-6">
                <h2 className="text-lg font-black text-gray-900 tracking-tight">Registro Transazioni</h2>
                <TransactionList transactions={filteredTransactionsByMonth} onDelete={deleteTransaction} />
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                <CalendarView 
                  transactions={transactions} 
                  selectedDate={selectedDate}
                  initialMonth={summaryMonth}
                  onMonthChange={(date) => setSummaryMonth(date)}
                  onEditTransaction={(t) => {
                    setEditingTransaction(t);
                    setSelectedDate(t.date);
                    setIsAddingTransaction(false);
                    setTimeout(scrollToForm, 100);
                  }}
                  onSelectDate={(date) => {
                    if (selectedDate && isSameDay(date, selectedDate)) {
                      setSelectedDate(null);
                      setIsAddingTransaction(false);
                      setEditingTransaction(null);
                    } else {
                      setSelectedDate(date);
                      const dayTransactions = transactions.filter(t => isSameDay(t.date, date));
                      setIsAddingTransaction(dayTransactions.length === 0);
                      setEditingTransaction(null);
                      if (dayTransactions.length === 0) {
                        setTimeout(scrollToForm, 100);
                      }
                    }
                  }} 
                />
              </div>
          <div className="lg:col-span-4 space-y-6">
            {/* Reset Data Button UI */}
            <div className={`p-4 rounded-2xl border transition-all ${
              resetConfig.step === 0 ? 'bg-white border-gray-100' : 
              resetConfig.step === 1 ? 'bg-amber-50 border-amber-200' : 
              'bg-red-50 border-red-200 shadow-md animate-pulse'
            }`}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Strumenti</p>
                    <p className="text-xs font-bold text-gray-700">
                      {resetConfig.step === 0 ? 'Gestione Dati' : 
                       resetConfig.step === 1 ? 'Cosa vuoi azzerare?' : 
                       `CONFERMA: Azzera ${resetConfig.type === 'month' ? 'questo mese' : 'TUTTO'}?`}
                    </p>
                  </div>
                  {resetConfig.step > 0 && (
                    <button 
                      onClick={() => setResetConfig({ step: 0, type: null })}
                      className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {resetConfig.step === 0 ? (
                  <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-xl text-xs font-black transition-all"
                  >
                    <Trash2 size={14} />
                    Azzera Dati
                  </button>
                ) : resetConfig.step === 1 ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setResetConfig({ step: 2, type: 'month' })}
                      className="py-2 bg-white border border-amber-200 text-amber-600 rounded-xl text-[10px] font-black hover:bg-amber-100 transition-all uppercase"
                    >
                      Mese Corrente
                    </button>
                    <button
                      onClick={() => setResetConfig({ step: 2, type: 'all' })}
                      className="py-2 bg-white border border-red-200 text-red-600 rounded-xl text-[10px] font-black hover:bg-red-100 transition-all uppercase"
                    >
                      Tutti i Dati
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleReset}
                    className="w-full py-3 bg-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-100 uppercase tracking-widest"
                  >
                    Conferma Cancellazione
                  </button>
                )}
              </div>
            </div>

            <div id="transaction-form-container" className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 outline-none">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                    {editingTransaction ? 'Modifica Transazione' : (selectedDate ? (isAddingTransaction ? `Nuova Voce - ${format(selectedDate, 'dd MMM', { locale: it })}` : `Registro - ${format(selectedDate, 'dd MMM', { locale: it })}`) : 'Nuova Transazione')}
                  </h2>
                  {(selectedDate || editingTransaction) && (
                    <button 
                      onClick={() => { setSelectedDate(null); setIsAddingTransaction(false); setEditingTransaction(null); }} 
                      className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
                    >
                      <X size={16} />
                    </button>
                  )}
               </div>
               
               {editingTransaction ? (
                 <div className="animate-in fade-in slide-in-from-right-4">
                   <TransactionForm 
                     onAdd={async (t) => { await addTransaction(t); setEditingTransaction(null); }} 
                     onUpdate={async (id, t) => { await updateTransaction(id, t); setEditingTransaction(null); }}
                     onDelete={async (id) => { await deleteTransaction(id); setEditingTransaction(null); }}
                     onDeleteSeries={async (pid) => { await deleteTransactionSeries(pid); setEditingTransaction(null); }}
                     userId={user.uid} 
                     initialData={editingTransaction} 
                   />
                   <button 
                    onClick={() => setEditingTransaction(null)}
                    className="w-full mt-4 py-2 text-gray-400 font-bold rounded-xl text-sm hover:text-gray-600 transition-all border border-transparent hover:border-gray-100"
                  >
                    Annulla Modifica
                  </button>
                 </div>
               ) : selectedDate ? (
                 <div className="space-y-4">
                    {isAddingTransaction ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <TransactionForm onAdd={async (t) => { await addTransaction(t); setIsAddingTransaction(false); }} userId={user.uid} defaultDate={selectedDate} />
                        <button 
                          onClick={() => setIsAddingTransaction(false)}
                          className="w-full py-2 text-gray-400 font-bold rounded-xl text-sm hover:text-gray-600 transition-all"
                        >
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                        <TransactionList 
                          transactions={filteredTransactionsByDate} 
                          onDelete={deleteTransaction}
                          onEdit={(t) => setEditingTransaction(t)}
                        />
                        <button 
                          onClick={() => setIsAddingTransaction(true)}
                          className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all hover:bg-blue-700 active:scale-95"
                        >
                          <Plus size={18} />
                          Aggiungi per il {format(selectedDate, 'd MMM', { locale: it })}
                        </button>
                      </div>
                    )}
                 </div>
               ) : (
                 <TransactionForm onAdd={addTransaction} userId={user.uid} />
               )}
            </div>
          </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
