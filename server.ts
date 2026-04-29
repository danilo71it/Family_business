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
  app.get('/api/v1/vapid-public-key', (req, res) => {
    const pub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
    console.log(`[VAPID_SERVE] Request from ${req.ip}. Key found: ${!!pub}`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ publicKey: pub, status: 'ok' });
  });

  app.get('/keys', (req, res) => {
    const pub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
    res.set('Content-Type', 'application/json');
    res.send({ publicKey: pub });
  });

  app.get('/health', (req, res) => res.send('OK'));

  // 2. Middleware generali
  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    if (req.url.includes('api') || req.url.includes('key')) {
      console.log(`[DEBUG] ${req.method} ${req.url}`);
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
