"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = require("./routes");
const vite_1 = require("./vite"); // فقط serveStatic مباشرة
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./auth");
const app = (0, express_1.default)();
// ✅ Define allowed CORS origins
const allowedOrigins = [
    'https://cleander-project-front.onrender.com',
    'https://cleander-project-server.onrender.com',
    'http://localhost:3000',
];
console.log('✅ Allowed CORS Origins:', allowedOrigins);
// ✅ CORS middleware
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        console.log('🔍 Request Origin:', origin);
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn('⛔ Blocked by CORS:', origin);
            callback(null, false);
        }
    },
    credentials: true,
}));
// ✅ Body parsers
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// ✅ Authentication setup
(0, auth_1.setupAuth)(app);
// ✅ Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse;
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
            (0, vite_1.log)(logLine);
        }
    });
    next();
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    const port = process.env.PORT || 5000;
    let server;
    // ✅ Register API routes
    server = yield (0, routes_1.registerRoutes)(app);
    // ✅ Serve frontend
    if (app.get('env') === 'development') {
        const { setupVite } = yield Promise.resolve().then(() => __importStar(require('./vite.js'))); // dynamic import
        yield setupVite(app, server);
    }
    else {
        (0, vite_1.serveStatic)(app);
    }
    // ✅ Global error handler
    app.use((err, _req, res, _next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || 'Internal Server Error';
        res.status(status).json({ message });
        console.error('🔥 Unhandled Error:', err);
    });
    server.listen({
        port: Number(port),
        host: '0.0.0.0',
    }, () => {
        (0, vite_1.log)(`🚀 Server running on http://0.0.0.0:${port}`);
    });
}))();
