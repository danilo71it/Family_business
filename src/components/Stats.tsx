import { Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  transactions: Transaction[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function Stats({ transactions }: Props) {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

  return (
    <div id="finance-stats" className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Entrate Totali</p>
        <p className="text-3xl font-mono font-bold text-green-600">
          {totalIncome.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Uscite Totali</p>
        <p className="text-3xl font-mono font-bold text-red-500">
          {totalExpense.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>

      <div className={`p-6 rounded-2xl shadow-sm border ${balance >= 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-red-600 border-red-700 text-white'}`}>
        <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">Bilancio Attuale</p>
        <p className="text-3xl font-mono font-bold">
          {balance.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>

      {chartData.length > 0 && (
        <div className="md:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Uscite per Categoria</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
