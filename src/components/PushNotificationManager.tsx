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
      
      // Fallback: fetch from server if env is empty (can happen in dev with custom server)
      if (!publicKey || publicKey === 'YOUR_PUBLIC_VAPID_KEY') {
        const res = await fetch('/api/notifications/config');
        if (res.ok) {
          const data = await res.json();
          publicKey = data.publicKey;
          if (!publicKey && data.availableKeys) {
            console.warn('Server VAPID keys:', data.availableKeys);
            const foundKey = data.availableKeys.find((k: string) => k.toLowerCase().includes('public'));
            if (foundKey) {
              throw new Error(`Trovata chiave '${foundKey}' ma non 'VITE_VAPID_PUBLIC_KEY'. Rinominala nei Secrets.`);
            }
          }
        }
      }

      if (!publicKey) {
        throw new Error('Chiave VAPID pubblica non trovata. Controlla i Secrets (VITE_VAPID_PUBLIC_KEY).');
      }

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
