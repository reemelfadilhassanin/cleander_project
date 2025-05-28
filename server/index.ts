import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import 'dotenv/config';
import cors from 'cors';
import { setupAuth } from './auth';

const app = express();

// ✅ CORS setup: use env variable or allow all (for safe testing)
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*')
      ) {
        return callback(null, true);
      } else {
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

// ✅ Request logging for API routes
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
  // ✅ Register API routes
  const server = await registerRoutes(app);

  // ✅ Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ message });
    console.error(err); // Keep the log; don't throw in production
  });

  // ✅ Dev: serve frontend with Vite middleware
  if (app.get('env') === 'development') {
    await setupVite(app, server);
  } else {
    // ✅ Prod: serve prebuilt frontend from Vite's output (dist/public)
    serveStatic(app); // Serve from dist/public
  }

  // ✅ Always use port 5000 (Render requires this)
  const port = process.env.PORT || 5000;
  server.listen(
    {
      port: Number(port),
      host: '0.0.0.0', // Required for Render public access
    },
    () => {
      log(`🚀 Server running on http://0.0.0.0:${port}`);
    }
  );
})();
