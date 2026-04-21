import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useFinance } from './hooks/useFinance';
import { Auth } from './components/Auth';
import { TransactionForm } from './components/TransactionForm';
import { TransactionList } from './components/TransactionList';
import { Stats } from './components/Stats';
import { LogOut, Plus, Users, Wallet, Loader2 } from 'lucide-react';

export default function App() {
  const { user, profile, loading: authLoading, login, logout, updateProfile } = useAuth();
  const { transactions, group, loading: financeLoading, addTransaction, deleteTransaction, createGroup } = useFinance(profile?.groupId || null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');

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
    setIsCreatingGroup(false);
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
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">FamigliAffari</h1>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{group?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 pr-4 border-r border-gray-100">
              <div className="text-right">
                <p className="text-xs font-bold text-gray-900 leading-none">{user.displayName}</p>
                <p className="text-[10px] text-gray-400 font-medium uppercase">{profile.email}</p>
              </div>
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-gray-100" referrerPolicy="no-referrer" alt="" />
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Esci"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Statistics Row */}
        <Stats transactions={transactions} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Nuova Voce</h2>
              </div>
              <div className="p-6">
                <TransactionForm 
                  onAdd={addTransaction} 
                  userId={user.uid} 
                />
              </div>
            </div>
          </div>

          {/* Right Column: List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Ultime Transazioni</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                  {transactions.length} TOT
                </span>
              </div>
            </div>

            {financeLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-blue-200" size={32} />
              </div>
            ) : (
              <TransactionList 
                transactions={transactions} 
                onDelete={deleteTransaction} 
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
