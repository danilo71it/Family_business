import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Transaction } from '../types';
import { isSameDay, subMinutes, subHours, subDays } from 'date-fns';
import { Bell, X, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  transactions: Transaction[];
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

interface ActiveAlert {
  id: string;
  title: string;
  time?: string;
  message: string;
}

export function NotificationService({ transactions, onUpdateTransaction }: Props) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setPermission('denied');
    }
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        console.log('Audio playback blocked - waiting for interaction');
      });
    }
  };

  const triggerNotification = (title: string, message: string, txId: string, item: Partial<Transaction>) => {
    setActiveAlerts(prev => {
      if (txId !== 'test' && prev.some(a => a.id.startsWith(txId!) && a.title === title)) return prev;
      return [{ id: `${txId}-${Date.now()}`, title, time: item.time, message }, ...prev].slice(0, 3);
    });

    if (permission === 'granted' && 'Notification' in window) {
      try { new Notification(title, { body: message }); } catch (e) {}
    }
    playSound();
  };

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      transactions.forEach(async (tx) => {
        const isAppointment = tx.type === 'appointment' || (tx.reminders && tx.reminders.length > 0 && tx.time);
        if (!isAppointment || !tx.reminders || tx.reminders.length === 0) return;
        if (!isSameDay(tx.date, now)) return;
        if (!tx.time) return;

        const [hours, minutes] = tx.time.split(':').map(Number);
        const appointmentTime = new Date(tx.date);
        appointmentTime.setHours(hours, minutes, 0, 0);

        let modified = false;
        const newReminders = [...tx.reminders];

        tx.reminders.forEach((reminder, idx) => {
          if (reminder.triggered) return;
          let triggerTime = new Date(appointmentTime);
          if (reminder.unit === 'minutes') triggerTime = subMinutes(appointmentTime, reminder.value);
          else if (reminder.unit === 'hours') triggerTime = subHours(appointmentTime, reminder.value);
          else if (reminder.unit === 'days') triggerTime = subDays(appointmentTime, reminder.value);

          const diffSeconds = (now.getTime() - triggerTime.getTime()) / 1000;
          if (diffSeconds >= -10 && diffSeconds < 60) {
             triggerNotification(`PROMEMORIA: ${tx.category}`, `L'appuntamento è alle ${tx.time}`, tx.id, tx);
             newReminders[idx] = { ...reminder, triggered: true };
             modified = true;
          }
        });

        if (modified) {
          onUpdateTransaction(tx.id, { reminders: newReminders }).catch(() => {});
        }
      });
    };

    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [transactions, permission]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[99999] flex flex-col items-center p-4">
      <div className="absolute bottom-24 right-4 pointer-events-auto">
        <button 
          onClick={() => triggerNotification('TEST', 'Il sistema è pronto!', 'test', { time: 'Ora' })}
          className="p-5 bg-indigo-600 text-white rounded-full shadow-2xl active:scale-75 transition-all border-4 border-white"
        >
          <Bell size={28} />
        </button>
      </div>

      <div className="w-full max-w-sm space-y-3 mt-10">
        <AnimatePresence mode="popLayout">
          {activeAlerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="pointer-events-auto bg-gray-900 border-2 border-indigo-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-4 flex gap-4 text-white relative"
            >
              <div className="p-3 bg-indigo-500/20 rounded-xl h-fit">
                <Bell size={24} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-indigo-400 mb-1">{alert.title}</h4>
                <p className="text-sm font-bold leading-tight">{alert.message}</p>
                {alert.time && <span className="text-[10px] font-bold text-gray-400 mt-1 block">Orario: {alert.time}</span>}
              </div>
              <button 
                onClick={() => setActiveAlerts(prev => prev.filter(a => a.id !== alert.id))} 
                className="absolute top-2 right-2 p-2 opacity-50 hover:opacity-100"
              >
                <X size={20} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {activeAlerts.length > 0 && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button onClick={playSound} className="px-6 py-2 bg-white text-indigo-600 rounded-full text-[10px] font-black uppercase border-2 border-indigo-600 shadow-xl">
            <Volume2 size={14} className="inline mr-2" /> 
            AUDIO OFF? PREMI QUI
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
