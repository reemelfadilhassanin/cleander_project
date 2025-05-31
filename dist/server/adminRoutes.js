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
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAdminRoutes = setupAdminRoutes;
const storage_1 = require("./storage");
function setupAdminRoutes(app) {
    // Get all events with user info
    app.get('/api/admin/events', (req, res) => __awaiter(this, void 0, void 0, function* () {
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(403).json({ message: 'غير مصرح بالوصول' });
        }
        try {
            const events = yield storage_1.storage.getAllEventsWithUsers();
            // Sort events: latest first by Gregorian date
            events.sort((a, b) => {
                const dateA = new Date(`${a.date.gregorian.year}-${a.date.gregorian.month}-${a.date.gregorian.day}`);
                const dateB = new Date(`${b.date.gregorian.year}-${b.date.gregorian.month}-${b.date.gregorian.day}`);
                return dateB.getTime() - dateA.getTime();
            });
            res.json(events);
        }
        catch (error) {
            console.error('Error fetching all events:', error);
            res.status(500).json({ message: 'حدث خطأ أثناء جلب جميع المناسبات' });
        }
    }));
    // Get all user
    app.get('/api/admin/users', (req, res) => {
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(403).json({ message: 'غير مصرح بالوصول' });
        }
        storage_1.storage
            .getAllUsers()
            .then((users) => res.json(users))
            .catch((err) => {
            console.error('Error fetching users:', err);
            res.status(500).json({ message: 'حدث خطأ أثناء جلب المستخدمين' });
        });
    });
    // Get specific user
    app.get('/api/admin/user/:userId', (req, res) => {
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(403).json({ message: 'غير مصرح بالوصول' });
        }
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'معرف المستخدم غير صالح' });
        }
        storage_1.storage
            .getUser(userId)
            .then((user) => {
            if (!user) {
                return res.status(404).json({ message: 'المستخدم غير موجود' });
            }
            res.json(user);
        })
            .catch((err) => {
            console.error('Error fetching user:', err);
            res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات المستخدم' });
        });
    });
    // Get events for a specific user
    app.get('/api/admin/user/:userId/events', (req, res) => __awaiter(this, void 0, void 0, function* () {
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(403).json({ message: 'غير مصرح بالوصول' });
        }
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'معرف المستخدم غير صالح' });
        }
        try {
            const events = yield storage_1.storage.getUserEvents(userId);
            res.json(events);
        }
        catch (error) {
            console.error('Error fetching user events:', error);
            res.status(500).json({ message: 'حدث خطأ أثناء جلب مناسبات المستخدم' });
        }
    }));
    // Lock a user account
    app.post('/api/admin/user/:userId/lock', (req, res) => {
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(403).json({ message: 'غير مصرح بالوصول' });
        }
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'معرف المستخدم غير صالح' });
        }
        const reason = req.body.reason;
        storage_1.storage
            .lockUserAccount(userId, reason)
            .then((success) => {
            if (!success) {
                return res
                    .status(404)
                    .json({ message: 'المستخدم غير موجود أو لا يمكن قفل الحساب' });
            }
            res.json({ success: true });
        })
            .catch((err) => {
            console.error('Error locking user account:', err);
            res.status(500).json({ message: 'حدث خطأ أثناء قفل حساب المستخدم' });
        });
    });
    // Unlock a user account
    app.post('/api/admin/user/:userId/unlock', (req, res) => {
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(403).json({ message: 'غير مصرح بالوصول' });
        }
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'معرف المستخدم غير صالح' });
        }
        storage_1.storage
            .unlockUserAccount(userId)
            .then((success) => {
            if (!success) {
                return res
                    .status(404)
                    .json({ message: 'المستخدم غير موجود أو لا يمكن فتح قفل الحساب' });
            }
            res.json({ success: true });
        })
            .catch((err) => {
            console.error('Error unlocking user account:', err);
            res
                .status(500)
                .json({ message: 'حدث خطأ أثناء فتح قفل حساب المستخدم' });
        });
    });
}
