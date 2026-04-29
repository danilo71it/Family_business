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
    const allKeys = Object.keys(process.env);
    const vapidKeys = allKeys.filter(k => k.toUpperCase().includes('VAPID'));
    
    console.log('--- DEBUG VAPID KEYS ---');
    console.log('Found VAPID-related keys in environment:', vapidKeys);
    console.log('VITE_VAPID_PUBLIC_KEY present:', !!process.env.VITE_VAPID_PUBLIC_KEY);
    console.log('VAPID_PRIVATE_KEY present:', !!process.env.VAPID_PRIVATE_KEY);
    console.log('------------------------');

    res.json({ 
      publicKey: process.env.VITE_VAPID_PUBLIC_KEY || '',
      availableKeys: vapidKeys
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
