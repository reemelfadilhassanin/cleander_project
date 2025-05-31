import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { type Server } from 'http';
import viteConfig from '../client/vite.config';
import { nanoid } from 'nanoid';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



export function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// ⚙️ Vite setup (development only)
export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer, createLogger } = await import('vite');
  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: 'custom',
  });

  app.use(vite.middlewares);

  // Serve index.html for non-API routes
  app.use('*', async (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();

    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        __dirname,
        '..',
        'client',
        'index.html'
      );
      let template = await fs.promises.readFile(clientTemplate, 'utf-8');

      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}


// 🏁 Static serving for production
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, 'public');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Serve static frontend assets
  app.use(express.static(distPath));

  // Serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();

    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}
