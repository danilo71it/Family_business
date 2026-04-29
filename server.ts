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

  // 1. PRIMARY LOGGER - MUST BE FIRST
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json());

  // 2. DIAGNOSTIC ROUTES
  const handleConfigCheck = (req: express.Request, res: express.Response) => {
    const pub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
    const priv = process.env.VAPID_PRIVATE_KEY || '';
    
    console.log(`[DEBUG] Config Check Triggered via ${req.url}`);
    console.log(`[DEBUG] VITE_VAPID_PUBLIC_KEY present: ${!!process.env.VITE_VAPID_PUBLIC_KEY} (len: ${process.env.VITE_VAPID_PUBLIC_KEY?.length})`);
    console.log(`[DEBUG] VAPID_PRIVATE_KEY present: ${!!process.env.VAPID_PRIVATE_KEY} (len: ${process.env.VAPID_PRIVATE_KEY?.length})`);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ 
      publicKey: pub,
      hasViteKey: !!process.env.VITE_VAPID_PUBLIC_KEY,
      hasPrivateKey: !!priv,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      availableEnvKeys: Object.keys(process.env).filter(k => k.includes('VAPID') || k.includes('VITE'))
    });
  };

  app.get('/api/debug-vars', handleConfigCheck);
  app.get('/config-check', handleConfigCheck);

  app.get('/health', (req, res) => res.send('OK - Server is active'));
  
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
