import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Transaction } from '../types';
import { isSameDay, subMinutes, subHours, subDays } from 'date-fns';
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
  const [mounted, setMounted] = useState(false);
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

    if ('Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setPermission('denied');
    }
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    // Register Service Worker for background notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          swRegistration.current = reg;
        })
        .catch(err => console.error('SW registration failed:', err));
    }
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
    // 1. In-app Alert (sempre visibile se l'app è aperta)
    setActiveAlerts(prev => {
      if (txId !== 'test' && prev.some(a => a.id.startsWith(txId!) && a.title === title)) return prev;
      return [{ id: `${txId}-${Date.now()}`, title, time: item.time, message }, ...prev].slice(0, 3);
    });

    // 2. Notifica Nativa (usa il Service Worker per miglior supporto background)
    if (permission === 'granted') {
      if (swRegistration.current) {
        swRegistration.current.showNotification(title, {
          body: message,
          icon: 'https://cdn-icons-png.flaticon.com/512/5552/5552462.png',
          vibrate: [200, 100, 200]
        }).catch(() => {
          try { new Notification(title, { body: message }); } catch (e) {}
        });
      } else if ('Notification' in window) {
        try { new Notification(title, { body: message }); } catch (e) {}
      }
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
      {/* Guida Installazione (Solo se non standalone e su mobile) */}
      {!isStandalone && mounted && (
        <div className="absolute top-20 left-4 right-4 pointer-events-auto sm:max-w-xs sm:left-auto sm:right-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl shadow-xl text-amber-900"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-xs font-black uppercase tracking-wider mb-1">Attiva notifiche background</p>
                <p className="text-xs leading-relaxed opacity-80">Per ricevere avvisi a schermo spento, clicca <b>Condividi</b> e poi <b>"Aggiungi a Home"</b>.</p>
              </div>
              <button onClick={() => setIsStandalone(true)} className="p-1 -mr-2 -mt-2 opacity-40"><X size={16} /></button>
            </div>
          </motion.div>
        </div>
      )}

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
