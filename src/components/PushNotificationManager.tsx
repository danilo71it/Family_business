/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface Props {
  userId?: string;
}

export function PushNotificationManager({ userId }: Props) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    async function checkSubscription() {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setIsSupported(true);
        setPermission(Notification.permission);
        
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setHasSubscription(!!subscription);
          if (subscription) {
            localStorage.setItem('push_subscription', JSON.stringify(subscription));
          }
        } catch (err) {
          console.error('Error checking subscription:', err);
        }
      }
    }
    checkSubscription();
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    if (!userId) return;
    setIsSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      let publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      let data: any = null;
      
      console.log('--- DEBUG CLIENT ---');
      console.log('Initial VAPID key from env:', publicKey);
      
      // Fallback: fetch from server if env is empty
      if (!publicKey || publicKey === 'YOUR_PUBLIC_VAPID_KEY') {
        try {
          const res = await fetch(`/api/debug-vars?t=${Date.now()}`);
          if (res.ok) {
            data = await res.json();
            console.log('Config from server:', data);
            publicKey = data.publicKey;
            
            if (!publicKey && data.availableEnvKeys) {
              console.warn('Server environment keys detected:', data.availableEnvKeys);
              const foundKey = data.availableEnvKeys.find((k: string) => k.toUpperCase().includes('VAPID') && k.toUpperCase().includes('PUBLIC'));
              if (foundKey && foundKey !== 'VITE_VAPID_PUBLIC_KEY') {
                throw new Error(`Hai inserito la chiave con nome '${foundKey}' ma il sistema cerca 'VITE_VAPID_PUBLIC_KEY'. Per favore rinominala nei Secrets.`);
              }
            }
          } else {
            console.error('Server returned error status:', res.status);
            data = { fetchError: `Server status ${res.status} for /api/debug-vars` };
          }
        } catch (fetchErr: any) {
          console.error('Failed to fetch config from server:', fetchErr);
          data = { fetchError: fetchErr.message || 'Network error' };
        }
      }

      if (!publicKey) {
        let diagnosticInfo = '';
        if (data && data.availableEnvKeys) {
          const keysFound = data.availableEnvKeys.join(', ');
          diagnosticInfo = keysFound ? ` (Chiavi rilevate: ${keysFound})` : ' (Nessuna chiave VAPID o VITE trovata nei Secrets)';
        } else if (data && data.fetchError) {
          diagnosticInfo = ` (Errore caricamento: ${data.fetchError})`;
        } else {
          diagnosticInfo = ' (Impossibile contattare il server o chiave mancante)';
        }
        throw new Error(`Chiave VAPID non trovata.${diagnosticInfo}. Assicurati di aver creato un Secret chiamato 'VITE_VAPID_PUBLIC_KEY' con il valore corretto e di aver cliccato 'Save'.`);
      }

      console.log('Using VAPID key for subscription:', publicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      const subObj = JSON.parse(JSON.stringify(subscription));

      // Save subscription to Firestore
      await setDoc(doc(db, 'users', userId, 'push_subscriptions', 'current'), {
        subscription: subObj,
        updatedAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

      setPermission('granted');
      setHasSubscription(true);
      localStorage.setItem('push_subscription', JSON.stringify(subObj));
      console.log('Push subscription successful');
    } catch (error: any) {
      console.error('Push subscription failed:', error);
      if (Notification.permission === 'denied') {
        alert('Hai bloccato le notifiche. Sbloccale cliccando sul lucchetto nella barra dell\'indirizzo del browser.');
      } else {
        alert(`Errore: ${error.message || 'Impossibile attivare le notifiche push.'}`);
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const sendTest = async () => {
    const subStr = localStorage.getItem('push_subscription');
    if (!subStr) return;
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: JSON.parse(subStr),
          payload: {
            title: 'Test Sistema',
            body: 'Se vedi questo, le notifiche push funzionano correttamente!'
          }
        })
      });
      if (response.ok) {
        alert('Richiesta inviata! Se l\'app ha i permessi e sei su un dispositivo supportato, la notifica apparirà a breve.');
      }
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
      <div className={`p-2 rounded-xl ${permission === 'granted' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
        {permission === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-bold text-indigo-900">Notifiche di Sistema</h3>
        <p className="text-[10px] text-indigo-600 font-medium">Ricevi avvisi anche ad app chiusa</p>
      </div>
      {(!hasSubscription) && (
        <button
          onClick={subscribe}
          disabled={isSubscribing}
          className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
        >
          {isSubscribing ? <Loader2 size={12} className="animate-spin" /> : 'Attiva Notifiche'}
        </button>
      )}
      {hasSubscription && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-black text-green-600 uppercase bg-green-50 px-2 py-1 rounded-md border border-green-100">
              Notifiche Attive
            </span>
            <button 
              onClick={sendTest}
              className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase rounded-2xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
            >
              🚀 Invia Test Notifica
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
