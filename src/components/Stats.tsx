import { Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  transactions: Transaction[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const INCOME_EXPENSE_COLORS = ['#10b981', '#ef4444'];

export function Stats({ transactions }: Props) {
  const [chartIndex, setChartIndex] = useState(0);

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

  const categoryData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
  
  const summaryData = [
    { name: 'Entrate', value: totalIncome },
    { name: 'Uscite', value: totalExpense }
  ].filter(d => d.value > 0);

  const charts = [
    {
      id: 'category',
      title: 'Distribuzione Uscite',
      data: categoryData,
      colors: COLORS,
      showLegend: true
    },
    {
      id: 'summary',
      title: 'Proporzione Entrate/Uscite',
      data: summaryData,
      colors: INCOME_EXPENSE_COLORS,
      showLegend: false
    }
  ].filter(c => c.data.length > 0);

  const nextChart = () => setChartIndex((prev) => (prev + 1) % charts.length);
  const prevChart = () => setChartIndex((prev) => (prev - 1 + charts.length) % charts.length);

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

      <div className={`p-6 rounded-2xl shadow-sm border transition-colors ${balance >= 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-red-600 border-red-700 text-white'}`}>
        <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">Bilancio Attuale</p>
        <p className="text-3xl font-mono font-bold">
          {balance.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>

      {charts.length > 0 && (
        <div className="md:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden outline-none ring-0">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-lg font-bold text-gray-800">{charts[chartIndex].title}</h3>
            <div className="flex gap-2">
              <button 
                onClick={prevChart} 
                className="p-1 hover:bg-gray-50 rounded-full transition-colors text-gray-400 outline-none"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={nextChart} 
                className="p-1 hover:bg-gray-50 rounded-full transition-colors text-gray-400 outline-none"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="min-h-[320px] sm:min-h-[300px] h-auto relative outline-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={charts[chartIndex].id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full outline-none"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50) nextChart();
                  if (info.offset.x > 50) prevChart();
                }}
              >
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart className="outline-none focus:outline-none">
                    <Pie
                      data={charts[chartIndex].data}
                      cx="50%"
                      cy="50%"
                      innerRadius={window.innerWidth < 640 ? 60 : 75}
                      outerRadius={window.innerWidth < 640 ? 85 : 100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      className="outline-none focus:outline-none"
                    >
                      {charts[chartIndex].data.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={charts[chartIndex].colors[index % charts[chartIndex].colors.length]} 
                          className="outline-none focus:outline-none"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                    />
                    {charts[chartIndex].showLegend && (
                      <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: '600' }}
                      />
                    )}
                    {charts[chartIndex].id === 'summary' && (
                      <text 
                        x="50%" 
                        y="50%" 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        className={`font-bold text-2xl font-mono ${balance >= 0 ? 'fill-green-500' : 'fill-red-500'}`}
                      >
                        {balance >= 0 ? '+' : '-'}{Math.abs(balance).toLocaleString('it-IT')} €
                      </text>
                    )}
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-center gap-1.5 mt-6 mb-2">
            {charts.map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === chartIndex ? 'bg-blue-600 w-5' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
