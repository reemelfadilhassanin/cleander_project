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
exports.log = log;
exports.setupVite = setupVite;
exports.serveStatic = serveStatic;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const path_2 = require("path");
const nanoid_1 = require("nanoid");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_2.dirname)(__filename);
function log(message, source = 'express') {
    const formattedTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
// فقط داخل هذه الدالة يتم استيراد vite واستخدامه
function setupVite(app, server) {
    return __awaiter(this, void 0, void 0, function* () {
        const { createServer: createViteServer, createLogger } = yield Promise.resolve().then(() => __importStar(require('vite')));
        const viteLogger = createLogger();
        // ✅ استيراد ديناميكي لـ vite.config.ts
        const viteConfig = (yield Promise.resolve().then(() => __importStar(require('../client/vite.config.ts')))).default;
        const serverOptions = {
            middlewareMode: true,
            hmr: { server },
            allowedHosts: true,
        };
        const vite = yield createViteServer(Object.assign(Object.assign({}, viteConfig), { configFile: false, customLogger: Object.assign(Object.assign({}, viteLogger), { error: (msg, options) => {
                    viteLogger.error(msg, options);
                    process.exit(1);
                } }), server: serverOptions, appType: 'custom' }));
        app.use(vite.middlewares);
        app.use('*', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            if (req.originalUrl.startsWith('/api'))
                return next();
            const url = req.originalUrl;
            try {
                const clientTemplate = path_1.default.resolve(__dirname, '..', 'client', 'index.html');
                let template = yield fs_1.default.promises.readFile(clientTemplate, 'utf-8');
                template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${(0, nanoid_1.nanoid)()}"`);
                const page = yield vite.transformIndexHtml(url, template);
                res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
            }
            catch (e) {
                vite.ssrFixStacktrace(e);
                next(e);
            }
        }));
    });
}
function serveStatic(app) {
    const distPath = path_1.default.resolve(__dirname, 'public');
    if (!fs_1.default.existsSync(distPath)) {
        throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    }
    app.use(express_1.default.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.originalUrl.startsWith('/api'))
            return next();
        res.sendFile(path_1.default.resolve(distPath, 'index.html'));
    });
}
