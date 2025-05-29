
import express, { type Request, type Response, type NextFunction } from 'express';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import 'dotenv/config'; // يجب أن يكون أول شيء
import cors from 'cors';
import { setupAuth } from './auth';

const app = express();

// ✅ Debug CORS origins
console.log('✅ Loaded CORS_ORIGIN:', process.env.CORS_ORIGIN);

// ✅ CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      } else {
        console.error('❌ Blocked by CORS:', origin); // 👈 يساعد على التتبع
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// ✅ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Authentication setup
setupAuth(app);

// ✅ Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: any;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // ✅ Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ message });
    console.error(err);
  });

  // ✅ Serve frontend
  if (app.get('env') === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = process.env.PORT || 5000;
  server.listen(
    {
      port: Number(port),
      host: '0.0.0.0',
    },
    () => {
      log(`🚀 Server running on http://0.0.0.0:${port}`);
    }
  );
})();
