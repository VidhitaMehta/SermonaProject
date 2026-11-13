import { createServer as createViteServer } from 'vite';
import express from 'express';
import path from 'path';
import app from './server/app.ts';

const PORT = Number(process.env.PORT) || 3000;

// Mount Vite or static server
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static('dist'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve('dist/index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sermona full-stack server running on http://0.0.0.0:${PORT}`);
});

