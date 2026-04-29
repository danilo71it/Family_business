import React, { useEffect, useState, useRef } from 'react';
import { Transaction, Reminder } from '../types';
import { isSameDay, parse, differenceInMinutes, subMinutes, subHours, subDays } from 'date-fns';
import { Bell, X, Volume2, AlertTriangle } from 'lucide-react';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // Create audio element for reuse
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.load();
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const resp = await Notification.requestPermission();
      setPermission(resp);
    }
  };

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.warn('Audio playback failed (interaction required?):', err);
      });
    }
  };

  const triggerNotification = (title: string, message: string, txId: string, item: Transaction) => {
    // 1. Browser Notification
    if (permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico'
      });
    }

    // 2. In-app Alert
    setActiveAlerts(prev => [...prev, { 
      id: `${txId}-${Date.now()}`, 
      title, 
      time: item.time,
      message 
    }]);

    // 3. Sound
    playSound();
  };

  // Check for reminders every minute
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      
      transactions.forEach(async (tx) => {
        if (tx.type !== 'appointment' || !tx.reminders || tx.reminders.length === 0) return;
        if (!isSameDay(tx.date, now)) return;
        if (!tx.time) return;

        // Parse appointment time
        const [hours, minutes] = tx.time.split(':').map(Number);
        const appointmentTime = new Date(tx.date);
        appointmentTime.setHours(hours, minutes, 0, 0);

        let modified = false;
        const newReminders = [...tx.reminders];

        tx.reminders.forEach((reminder, idx) => {
          if (reminder.triggered) return;

          // Calculate when the reminder should go off
          let triggerTime = new Date(appointmentTime);
          if (reminder.unit === 'minutes') triggerTime = subMinutes(appointmentTime, reminder.value);
          else if (reminder.unit === 'hours') triggerTime = subHours(appointmentTime, reminder.value);
          else if (reminder.unit === 'days') triggerTime = subDays(appointmentTime, reminder.value);

          // If the trigger time is now or in the past (but not too far in the past, e.g., within the last 5 mins)
          const diffSeconds = (now.getTime() - triggerTime.getTime()) / 1000;
          
          if (diffSeconds >= 0 && diffSeconds < 120) { // Catch-up window of 2 minutes
             triggerNotification(
               `PROMEMORIA: ${tx.category}`,
               `L'appuntamento è previsto tra ${reminder.value} ${reminder.unit === 'minutes' ? 'minuti' : reminder.unit === 'hours' ? 'ore' : 'giorni'}${tx.address ? ' presso ' + tx.address : ''}`,
               tx.id,
               tx
             );
             
             newReminders[idx] = { ...reminder, triggered: true };
             modified = true;
          }
        });

        if (modified) {
          await onUpdateTransaction(tx.id, { reminders: newReminders });
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Every minute
    checkReminders(); // Initial check
    
    return () => clearInterval(interval);
  }, [transactions, permission, onUpdateTransaction]);

  return (
    <>
      {/* Permission Prompt Banner */}
      {permission === 'default' && (
        <div className="fixed bottom-24 left-4 right-4 z-[100] sm:left-auto sm:right-6 sm:w-80">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl border border-indigo-500/50 flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <Bell className="animate-bounce" />
              <p className="text-sm font-bold">Attiva le notifiche per non perdere gli appuntamenti</p>
            </div>
            <button 
              onClick={requestPermission}
              className="bg-white text-indigo-600 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/90 transition-all"
            >
              ATTIVA ORA
            </button>
          </motion.div>
        </div>
      )}

      {/* In-app Alerts List */}
      <div className="fixed top-24 right-4 left-4 sm:left-auto sm:right-6 z-[200] space-y-3 pointer-events-none sm:w-[350px]">
        <AnimatePresence>
          {activeAlerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="pointer-events-auto bg-white border-l-4 border-l-indigo-600 rounded-2xl shadow-2xl p-4 flex gap-4 overflow-hidden relative group"
            >
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl h-fit">
                <Bell size={24} />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-black text-gray-900 text-xs uppercase tracking-wider truncate">{alert.title}</h4>
                  {alert.time && (
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold">
                       {alert.time}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 leading-snug">{alert.message}</p>
              </div>
              <button 
                onClick={() => setActiveAlerts(prev => prev.filter(a => a.id !== alert.id))}
                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
              
              {/* Audio feedback indicator */}
              <div className="absolute right-2 bottom-2 text-indigo-200">
                <Volume2 size={12} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Audio permission reminder if blocked (common on mobile) */}
      {activeAlerts.length > 0 && (
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button 
              onClick={() => playSound()}
              className="px-4 py-2 bg-gray-900/80 backdrop-blur-md text-white text-[10px] font-bold rounded-full flex items-center gap-2 border border-white/20 whitespace-nowrap"
            >
              <AlertTriangle size={12} className="text-amber-400" />
              NON SENTI L'AUDIO? CLICCA QUI
            </button>
         </div>
      )}
    </>
  );
}
