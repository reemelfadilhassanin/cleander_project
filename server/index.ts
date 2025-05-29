import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import 'dotenv/config'; // Load environment variables first
import cors from 'cors';
import { setupAuth } from './auth';

const app = express();

// ✅ Define allowed CORS origins
const allowedOrigins = [
  'https://cleander-project-front.onrender.com',
  'http://localhost:3000',
];

// ✅ Debug CORS origins
console.log('✅ Allowed CORS Origins:', allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      console.log('🔍 Request Origin:', origin);

      // Allow requests with no origin (like curl or mobile apps)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('⛔ Blocked by CORS:', origin);
        callback(null, false); // Reject without throwing an error
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

  // ✅ Error handler (for all uncaught middleware errors)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ message });
    console.error('🔥 Unhandled Error:', err);
  });

  // ✅ Serve frontend (via Vite in dev or static in prod)
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
