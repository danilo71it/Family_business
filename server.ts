import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const vapidKeys = {
  publicKey: process.env.VITE_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

console.log('--- STARTUP VAPID CHECK ---');
console.log('VITE_VAPID_PUBLIC_KEY length:', vapidKeys.publicKey.length);
console.log('VAPID_PRIVATE_KEY length:', vapidKeys.privateKey.length);
console.log('Available env keys:', Object.keys(process.env).filter(k => k.includes('VAPID') || k.includes('VITE')));
console.log('---------------------------');

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:danilo.sbergia@gmail.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API to send a test notification or trigger by Firestore (conceptually)
  app.get('/api/notifications/config', (req, res) => {
    // Check if VAPID keys are present in any case or prefix
    const allKeys = Object.keys(process.env);
    
    // Specifically check for our keys
    const publicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
    
    // Find all keys that might be relevant for debugging
    const debugKeys = allKeys.filter(k => 
      k.toUpperCase().includes('VAPID') || 
      k.toUpperCase().includes('PUBLIC') || 
      k.toUpperCase().includes('PRIVATE')
    ).map(k => ({ name: k, length: process.env[k]?.length }));

    console.log('--- SERVER ENVIRONMENT DIAGNOSTIC ---');
    console.log('PublicKey present:', !!publicKey);
    console.log('Debug Keys:', debugKeys);
    
    res.json({ 
      publicKey: publicKey,
      debugInfo: debugKeys
    });
  });

  app.post('/api/notifications/send', async (req, res) => {
    const { subscription, payload } = req.body;
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Push Error:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
