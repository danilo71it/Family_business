import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import webpush from 'web-push';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const vapidKeys = {
  publicKey: process.env.VITE_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:danilo.sbergia@gmail.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  } catch (err) {
    console.error('Failed to set VAPID details:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // 1. PRIMARY LOGGER
  app.use((req, res, next) => {
    if (req.url !== '/health') {
      console.log(`[REQUEST] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    }
    next();
  });

  // 2. DIAGNOSTIC ROUTES
  const handleConfigCheck = (req: express.Request, res: express.Response) => {
    const pub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ 
      publicKey: pub,
      hasViteKey: !!process.env.VITE_VAPID_PUBLIC_KEY,
      nodeEnv: process.env.NODE_ENV,
      availableKeys: Object.keys(process.env).filter(k => k.includes('VAPID'))
    });
  };

  app.get('/api/push-config', handleConfigCheck);
  app.get('/config-check', handleConfigCheck);
  app.get('/health', (req, res) => res.send('OK'));
  
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
