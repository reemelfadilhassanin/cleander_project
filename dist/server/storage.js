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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.DatabaseStorage = void 0;
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const schema_2 = require("@shared/schema");
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const db_1 = require("./db");
const db_2 = require("./db");
const drizzle_orm_2 = require("drizzle-orm");
const PostgresSessionStore = (0, connect_pg_simple_1.default)(express_session_1.default);
class DatabaseStorage {
    constructor() {
        this.sessionStore = new PostgresSessionStore({
            pool: db_2.pool,
            createTableIfMissing: true,
            tableName: 'user_sessions',
        });
    }
    getCategoryById(categoryId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [category] = yield db_1.db
                    .select()
                    .from(schema_1.categories)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.categories.userId), // فئة عامة
                (0, drizzle_orm_1.eq)(schema_1.categories.userId, userId) // فئة تخص هذا المستخدم
                )));
                return category;
            }
            catch (error) {
                console.error('خطأ في جلب التصنيف حسب المعرف:', error);
                return undefined;
            }
        });
    }
    // async getCategoryById(categoryId: number): Promise<Category | undefined> {
    //   try {
    //     const [category] = await db
    //       .select()
    //       .from(categories)
    //       .where(eq(categories.id, categoryId));
    //     return category;
    //   } catch (error) {
    //     console.error('خطأ في جلب التصنيف حسب المعرف:', error);
    //     return undefined;
    //   }
    // }
    // جلب التصنيفات الخاصة بالمستخدم
    getUserCategories(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield db_1.db
                    .select()
                    .from(schema_1.categories)
                    .where((0, drizzle_orm_1.eq)(schema_1.categories.userId, userId))
                    .orderBy((0, drizzle_orm_2.desc)(schema_1.categories.id));
            }
            catch (error) {
                console.error('خطأ في جلب تصنيفات المستخدم:', error);
                return [];
            }
        });
    }
    // إنشاء تصنيف جديد
    createCategory(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [category] = yield db_1.db.insert(schema_1.categories).values(data).returning();
                return category;
            }
            catch (error) {
                console.error('خطأ في إنشاء التصنيف:', error);
                throw error;
            }
        });
    }
    // تحديث تصنيف موجود
    updateCategory(categoryId, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [updatedCategory] = yield db_1.db
                    .update(schema_1.categories)
                    .set(updateData)
                    .where((0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId))
                    .returning();
                return updatedCategory;
            }
            catch (error) {
                console.error('خطأ في تحديث التصنيف:', error);
                throw error;
            }
        });
    }
    // حذف تصنيف
    deleteCategory(categoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield db_1.db.delete(schema_1.categories).where((0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId));
            }
            catch (error) {
                console.error('خطأ في حذف التصنيف:', error);
                throw error;
            }
        });
    }
    createEvent(eventData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [event] = yield db_1.db.insert(schema_2.events).values(eventData).returning();
                return event;
            }
            catch (error) {
                console.error('خطأ في إنشاء المناسبة:', error);
                throw error;
            }
        });
    }
    getUser(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [user] = yield db_1.db
                    .select({
                    id: schema_2.users.id,
                    email: schema_2.users.email,
                    password: schema_2.users.password,
                    name: schema_2.users.name,
                    isAdmin: schema_2.users.isAdmin,
                    createdAt: schema_2.users.createdAt,
                    resetToken: schema_2.users.resetToken,
                    resetTokenExpiry: schema_2.users.resetTokenExpiry,
                    verificationToken: schema_2.users.verificationToken,
                    lastLogin: (0, drizzle_orm_2.sql) `NULL`.as(),
                    accountLocked: (0, drizzle_orm_2.sql) `FALSE`.as(),
                    lockReason: (0, drizzle_orm_2.sql) `NULL`.as(),
                })
                    .from(schema_2.users)
                    .where((0, drizzle_orm_1.eq)(schema_2.users.id, id));
                return user;
            }
            catch (error) {
                console.error('خطأ في الحصول على المستخدم:', error);
                return undefined;
            }
        });
    }
    deleteEvent(eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.db
                    .delete(schema_2.events)
                    .where((0, drizzle_orm_1.eq)(schema_2.events.id, eventId))
                    .returning({ id: schema_2.events.id });
                return result.length > 0;
            }
            catch (error) {
                console.error('خطأ في حذف المناسبة:', error);
                return false;
            }
        });
    }
    updateEvent(eventId, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [updated] = yield db_1.db
                    .update(schema_2.events)
                    .set(updateData)
                    .where((0, drizzle_orm_1.eq)(schema_2.events.id, eventId))
                    .returning();
                return updated;
            }
            catch (error) {
                console.error('خطأ في تعديل المناسبة:', error);
                return undefined;
            }
        });
    }
    getUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [user] = yield db_1.db
                    .select({
                    id: schema_2.users.id,
                    email: schema_2.users.email,
                    password: schema_2.users.password,
                    name: schema_2.users.name,
                    isAdmin: schema_2.users.isAdmin,
                    createdAt: schema_2.users.createdAt,
                    resetToken: schema_2.users.resetToken,
                    resetTokenExpiry: schema_2.users.resetTokenExpiry,
                    verificationToken: schema_2.users.verificationToken,
                    lastLogin: (0, drizzle_orm_2.sql) `NULL`.as(),
                    accountLocked: (0, drizzle_orm_2.sql) `FALSE`.as(),
                    lockReason: (0, drizzle_orm_2.sql) `NULL`.as(),
                })
                    .from(schema_2.users)
                    .where((0, drizzle_orm_1.eq)(schema_2.users.email, email));
                return user;
            }
            catch (error) {
                console.error('خطأ في الحصول على المستخدم بواسطة البريد الإلكتروني:', error);
                return undefined;
            }
        });
    }
    createUser(insertUser) {
        return __awaiter(this, void 0, void 0, function* () {
            const [user] = yield db_1.db.insert(schema_2.users).values(insertUser).returning();
            return user;
        });
    }
    getAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield db_1.db
                    .select({
                    id: schema_2.users.id,
                    email: schema_2.users.email,
                    password: schema_2.users.password,
                    name: schema_2.users.name,
                    isAdmin: schema_2.users.isAdmin,
                    createdAt: schema_2.users.createdAt,
                    resetToken: schema_2.users.resetToken,
                    resetTokenExpiry: schema_2.users.resetTokenExpiry,
                    verificationToken: schema_2.users.verificationToken,
                    lastLogin: (0, drizzle_orm_2.sql) `NULL`.as(),
                    accountLocked: (0, drizzle_orm_2.sql) `FALSE`.as(),
                    lockReason: (0, drizzle_orm_2.sql) `NULL`.as(),
                })
                    .from(schema_2.users);
            }
            catch (error) {
                console.error('خطأ في الحصول على جميع المستخدمين:', error);
                return [];
            }
        });
    }
    setResetToken(email, token, expiryDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const formattedDate = expiryDate.toISOString();
                const result = yield db_1.db
                    .update(schema_2.users)
                    .set({ resetToken: token, resetTokenExpiry: formattedDate })
                    .where((0, drizzle_orm_1.eq)(schema_2.users.email, email))
                    .returning({ id: schema_2.users.id });
                return result.length > 0;
            }
            catch (error) {
                console.error('خطأ عند تعيين رمز إعادة تعيين كلمة المرور:', error);
                return false;
            }
        });
    }
    getUserByResetToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const today = new Date();
                const [user] = yield db_1.db
                    .select()
                    .from(schema_2.users)
                    .where((0, drizzle_orm_1.eq)(schema_2.users.resetToken, token));
                if (user && user.resetTokenExpiry) {
                    const expiryDate = new Date(user.resetTokenExpiry);
                    if (expiryDate > today)
                        return user;
                }
                return undefined;
            }
            catch (error) {
                console.error('خطأ عند البحث عن المستخدم برمز إعادة التعيين:', error);
                return undefined;
            }
        });
    }
    updateUserPassword(userId, newPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.db
                    .update(schema_2.users)
                    .set({ password: newPassword })
                    .where((0, drizzle_orm_1.eq)(schema_2.users.id, userId))
                    .returning({ id: schema_2.users.id });
                return result.length > 0;
            }
            catch (error) {
                console.error('خطأ عند تحديث كلمة المرور:', error);
                return false;
            }
        });
    }
    clearResetToken(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.db
                    .update(schema_2.users)
                    .set({ resetToken: null, resetTokenExpiry: null })
                    .where((0, drizzle_orm_1.eq)(schema_2.users.id, userId))
                    .returning({ id: schema_2.users.id });
                return result.length > 0;
            }
            catch (error) {
                console.error('خطأ عند مسح رمز إعادة التعيين:', error);
                return false;
            }
        });
    }
    updateUser(userId, userData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.db
                    .update(schema_2.users)
                    .set(userData)
                    .where((0, drizzle_orm_1.eq)(schema_2.users.id, userId))
                    .returning({ id: schema_2.users.id });
                return result.length > 0;
            }
            catch (error) {
                console.error('خطأ في تحديث بيانات المستخدم:', error);
                return false;
            }
        });
    }
    deleteUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.db
                    .delete(schema_2.users)
                    .where((0, drizzle_orm_1.eq)(schema_2.users.id, userId))
                    .returning({ id: schema_2.users.id });
                return result.length > 0;
            }
            catch (error) {
                console.error('خطأ في حذف المستخدم:', error);
                return false;
            }
        });
    }
    setLastLogin(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.db
                    .update(schema_2.users)
                    .set({ lastLogin: (0, drizzle_orm_2.sql) `CURRENT_TIMESTAMP` })
                    .where((0, drizzle_orm_1.eq)(schema_2.users.id, userId))
                    .returning({ id: schema_2.users.id });
                return result.length > 0;
            }
            catch (error) {
                console.error('خطأ في تحديث وقت آخر تسجيل دخول:', error);
                return false;
            }
        });
    }
    lockUserAccount(userId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.db
                    .update(schema_2.users)
                    .set({ accountLocked: true, lockReason: reason || null })
                    .where((0, drizzle_orm_1.eq)(schema_2.users.id, userId))
                    .returning({ id: schema_2.users.id });
                return result.length > 0;
            }
            catch (error) {
                console.error('خطأ في قفل حساب المستخدم:', error);
                return false;
            }
        });
    }
    unlockUserAccount(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield db_1.db
                    .update(schema_2.users)
                    .set({ accountLocked: false, lockReason: null })
                    .where((0, drizzle_orm_1.eq)(schema_2.users.id, userId))
                    .returning({ id: schema_2.users.id });
                return result.length > 0;
            }
            catch (error) {
                console.error('خطأ في إلغاء قفل حساب المستخدم:', error);
                return false;
            }
        });
    }
    getUserEvents(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield db_1.db
                    .select()
                    .from(schema_2.events)
                    .where((0, drizzle_orm_1.eq)(schema_2.events.userId, userId))
                    .orderBy((0, drizzle_orm_2.desc)(schema_2.events.createdAt));
            }
            catch (error) {
                console.error('خطأ في استرجاع مناسبات المستخدم:', error);
                return [];
            }
        });
    }
    getEventById(eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [event] = yield db_1.db
                    .select()
                    .from(schema_2.events)
                    .where((0, drizzle_orm_1.eq)(schema_2.events.id, eventId));
                return event;
            }
            catch (error) {
                console.error('خطأ في استرجاع المناسبة:', error);
                return undefined;
            }
        });
    }
    getAllEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield db_1.db.select().from(schema_2.events).orderBy((0, drizzle_orm_2.desc)(schema_2.events.createdAt));
            }
            catch (error) {
                console.error('خطأ في استرجاع جميع المناسبات:', error);
                return [];
            }
        });
    }
    getSystemSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [settings] = yield db_1.db
                    .select()
                    .from(schema_2.systemSettings)
                    .orderBy((0, drizzle_orm_2.desc)(schema_2.systemSettings.lastUpdated))
                    .limit(1);
                return settings;
            }
            catch (error) {
                console.error('خطأ في استرجاع إعدادات النظام:', error);
                return undefined;
            }
        });
    }
    updateSystemSettings(settings, updatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const currentSettings = yield this.getSystemSettings();
                if (currentSettings) {
                    const result = yield db_1.db
                        .update(schema_2.systemSettings)
                        .set(Object.assign(Object.assign({}, settings), { updatedBy, lastUpdated: (0, drizzle_orm_2.sql) `CURRENT_TIMESTAMP` }))
                        .where((0, drizzle_orm_1.eq)(schema_2.systemSettings.id, currentSettings.id))
                        .returning({ id: schema_2.systemSettings.id });
                    return result.length > 0;
                }
                else {
                    const [newSettings] = yield db_1.db
                        .insert(schema_2.systemSettings)
                        .values(Object.assign(Object.assign({}, settings), { updatedBy, lastUpdated: new Date() }))
                        .returning({ id: schema_2.systemSettings.id });
                    return !!newSettings;
                }
            }
            catch (error) {
                console.error('خطأ في تحديث إعدادات النظام:', error);
                return false;
            }
        });
    }
    setMaintenanceMode(enabled, message, updatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return this.updateSystemSettings({ maintenanceMode: enabled, maintenanceMessage: message }, updatedBy);
            }
            catch (error) {
                console.error('خطأ في تغيير وضع الصيانة:', error);
                return false;
            }
        });
    }
    updateTermsOfService(content, updatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return this.updateSystemSettings({ termsOfService: content }, updatedBy);
            }
            catch (error) {
                console.error('خطأ في تحديث شروط الاستخدام:', error);
                return false;
            }
        });
    }
    updatePrivacyPolicy(content, updatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return this.updateSystemSettings({ privacyPolicy: content }, updatedBy);
            }
            catch (error) {
                console.error('خطأ في تحديث سياسة الخصوصية:', error);
                return false;
            }
        });
    }
}
exports.DatabaseStorage = DatabaseStorage;
exports.storage = new DatabaseStorage();
