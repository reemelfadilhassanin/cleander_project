"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const path_1 = require("path");
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
exports.default = (0, vite_1.defineConfig)({
    base: './', // ✅ ضروري للإنتاج على Render
    plugins: [(0, plugin_react_1.default)()],
    resolve: {
        alias: {
            '@': (0, path_1.resolve)(__dirname, 'src'),
            '@shared': (0, path_1.resolve)(__dirname, 'shared'),
            '@assets': (0, path_1.resolve)(__dirname, 'attached_assets'),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': 'https://cleander-project-server.onrender.com',
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
});
