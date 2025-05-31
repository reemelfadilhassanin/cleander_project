"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.requireAuth = requireAuth;
exports.isAdmin = isAdmin;
exports.setupAuth = setupAuth;
const passport_1 = __importDefault(require("passport"));
const passport_local_1 = require("passport-local");
const express_session_1 = __importDefault(require("express-session"));
const crypto_1 = require("crypto");
const util_1 = require("util");
const storage_1 = require("./storage");
const scryptAsync = (0, util_1.promisify)(crypto_1.scrypt);
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function* () {
        const salt = (0, crypto_1.randomBytes)(16).toString('hex');
        const buf = (yield scryptAsync(password, salt, 64));
        return `${buf.toString('hex')}.${salt}`;
    });
}
function comparePasswords(supplied, stored) {
    return __awaiter(this, void 0, void 0, function* () {
        const [hashed, salt] = stored.split('.');
        const hashedBuf = Buffer.from(hashed, 'hex');
        const suppliedBuf = (yield scryptAsync(supplied, salt, 64));
        return (0, crypto_1.timingSafeEqual)(hashedBuf, suppliedBuf);
    });
}
function requireAuth(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: 'غير مصرح' });
    }
    next();
}
// middleware للتحقق من صلاحيات المدير
function isAdmin(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: 'يجب تسجيل الدخول أولاً' });
    }
    if (!req.user || !req.user.isAdmin) {
        return res
            .status(403)
            .json({ message: 'غير مصرح لك بالوصول إلى هذه الصفحة' });
    }
    next();
}
function setupAuth(app) {
    const sessionSecret = process.env.SESSION_SECRET || (0, crypto_1.randomBytes)(32).toString('hex');
    const isProduction = process.env.NODE_ENV === 'production';
    const sessionSettings = {
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        store: storage_1.storage.sessionStore,
        cookie: {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            secure: isProduction, // فقط في الإنتاج
            sameSite: isProduction ? 'none' : 'lax', // none فقط مع secure: true
            httpOnly: true,
        },
    };
    if (isProduction) {
        app.set('trust proxy', 1); // إذا خلف proxy مثل Heroku أو nginx
    }
    app.use((0, express_session_1.default)(sessionSettings));
    app.use(passport_1.default.initialize());
    app.use(passport_1.default.session());
    passport_1.default.use(new passport_local_1.Strategy({ usernameField: 'email' }, (email, password, done) => __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield storage_1.storage.getUserByEmail(email);
            if (!user || !(yield comparePasswords(password, user.password))) {
                return done(null, false, {
                    message: 'خطأ في البريد الإلكتروني أو كلمة المرور',
                });
            }
            return done(null, user);
        }
        catch (err) {
            return done(err);
        }
    })));
    passport_1.default.serializeUser((user, done) => done(null, user.id));
    passport_1.default.deserializeUser((id, done) => __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield storage_1.storage.getUser(id);
            if (!user) {
                return done(null, false);
            }
            done(null, user);
        }
        catch (err) {
            done(err);
        }
    }));
    // Registration endpoint
    app.post('/api/register', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'يرجى تعبئة جميع الحقول' });
        }
        try {
            const existingUser = yield storage_1.storage.getUserByEmail(email);
            if (existingUser) {
                return res
                    .status(400)
                    .json({ message: 'البريد الإلكتروني مستخدم بالفعل' });
            }
            const hashedPassword = yield hashPassword(password);
            const user = yield storage_1.storage.createUser({
                email,
                password: hashedPassword,
                name,
                isAdmin: false,
                verificationToken: null,
            });
            const { password: _ } = user, safeUser = __rest(user, ["password"]);
            req.login(user, (err) => {
                if (err)
                    return next(err);
                return res.status(201).json(safeUser);
            });
        }
        catch (err) {
            console.error('Registration error:', err);
            return res.status(500).json({ message: 'حدث خطأ أثناء التسجيل' });
        }
    }));
    // Login endpoint
    app.post('/api/login', (req, res, next) => {
        passport_1.default.authenticate('local', (err, user, info) => {
            if (err)
                return next(err);
            if (!user) {
                return res.status(401).json({
                    message: (info === null || info === void 0 ? void 0 : info.message) || 'خطأ في البريد الإلكتروني أو كلمة المرور',
                });
            }
            // ✅ تم حذف شرط التحقق من البريد الإلكتروني
            req.login(user, (err) => {
                if (err)
                    return next(err);
                const { password } = user, safeUser = __rest(user, ["password"]);
                return res.json(safeUser);
            });
        })(req, res, next);
    });
    // Logout endpoint
    app.post('/api/logout', (req, res, next) => {
        req.logout((err) => {
            if (err)
                return next(err);
            res.sendStatus(200);
        });
    });
    // Current user endpoint
    app.get('/api/user', (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: 'غير مصرح' });
        }
        const _a = req.user, { password } = _a, safeUser = __rest(_a, ["password"]);
        res.json(safeUser);
    });
    // Admin users list endpoint (protected)
    app.get('/api/admin/users', (req, res) => __awaiter(this, void 0, void 0, function* () {
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(403).json({ message: 'غير مصرح لك بالوصول' });
        }
        try {
            const allUsers = yield storage_1.storage.getAllUsers();
            const safeUsers = allUsers.map((_a) => {
                var { password } = _a, user = __rest(_a, ["password"]);
                return user;
            });
            res.json(safeUsers);
        }
        catch (err) {
            console.error('Error fetching users:', err);
            res.status(500).json({ message: 'حدث خطأ أثناء جلب المستخدمين' });
        }
    }));
}
