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

  // 1. ROTTE CRITICHE - Prima di ogni altra cosa
  console.log('[PUSH_INIT] Checking environment keys...');
  console.log(`[PUSH_INIT] VITE_VAPID_PUBLIC_KEY exists: ${!!process.env.VITE_VAPID_PUBLIC_KEY}`);
  console.log(`[PUSH_INIT] VAPID_PRIVATE_KEY exists: ${!!process.env.VAPID_PRIVATE_KEY}`);

  const vapidHandler = (req: express.Request, res: express.Response) => {
    const pub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
    console.log(`[VAPID_SERVE] Request: ${req.url} - Agent: ${req.get('user-agent')}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(JSON.stringify({ publicKey: pub, status: 'ok' }));
  };

  app.get('/api/v1/vapid-public-key', vapidHandler);
  app.get('/get-vapid-key', vapidHandler);
  app.get('/keys', vapidHandler);
  app.get('/config-check', vapidHandler);

  app.get('/health', (req, res) => res.send('OK'));

  // 2. Middleware generali
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    if (req.url.includes('api') || req.url.includes('key') || req.url.includes('sw.js')) {
      console.log(`[HTTP LOG] ${req.method} ${req.url}`);
    }
    next();
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
