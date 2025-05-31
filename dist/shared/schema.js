"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertCategorySchema = exports.insertSystemSettingsSchema = exports.insertEventSchema = exports.systemSettings = exports.categories = exports.events = exports.insertUserSchema = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// User model for authentication
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    email: (0, pg_core_1.text)('email').notNull().unique(), // Changed username to email
    password: (0, pg_core_1.text)('password').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    isAdmin: (0, pg_core_1.boolean)('is_admin').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    resetToken: (0, pg_core_1.text)('reset_token'),
    resetTokenExpiry: (0, pg_core_1.text)('reset_token_expiry'), // تغيير من date إلى text
    emailVerified: (0, pg_core_1.boolean)('email_verified').default(false),
    verificationToken: (0, pg_core_1.text)('verification_token'),
    lastLogin: (0, pg_core_1.timestamp)('last_login'),
    accountLocked: (0, pg_core_1.boolean)('account_locked').default(false),
    lockReason: (0, pg_core_1.text)('lock_reason'),
});
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).pick({
    email: true,
    password: true,
    name: true,
    isAdmin: true,
    emailVerified: true,
    verificationToken: true,
    accountLocked: true,
    lockReason: true,
});
// Events model for personal events
exports.events = (0, pg_core_1.pgTable)('events', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id')
        .notNull()
        .references(() => exports.users.id),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    hijriDay: (0, pg_core_1.integer)('hijri_day'),
    hijriMonth: (0, pg_core_1.integer)('hijri_month'),
    hijriYear: (0, pg_core_1.integer)('hijri_year'),
    gregorianDay: (0, pg_core_1.integer)('gregorian_day'),
    gregorianMonth: (0, pg_core_1.integer)('gregorian_month'),
    gregorianYear: (0, pg_core_1.integer)('gregorian_year'),
    isHijri: (0, pg_core_1.boolean)('is_hijri').notNull().default(true),
    categoryId: (0, pg_core_1.integer)('category_id').references(() => exports.categories.id),
    days: (0, pg_core_1.integer)('days').default(1).notNull(),
    eventTime: (0, pg_core_1.time)('event_time'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.categories = (0, pg_core_1.pgTable)('categories', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    color: (0, pg_core_1.text)('color').notNull(),
    isDefault: (0, pg_core_1.boolean)('is_default').default(false),
    userId: (0, pg_core_1.integer)('user_id')
        .references(() => exports.users.id)
        .default(null),
});
// System settings model
exports.systemSettings = (0, pg_core_1.pgTable)('system_settings', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    maintenanceMode: (0, pg_core_1.boolean)('maintenance_mode').default(false).notNull(),
    maintenanceMessage: (0, pg_core_1.text)('maintenance_message'),
    privacyPolicy: (0, pg_core_1.text)('privacy_policy'),
    termsOfService: (0, pg_core_1.text)('terms_of_service'),
    lastUpdated: (0, pg_core_1.timestamp)('last_updated').defaultNow().notNull(),
    updatedBy: (0, pg_core_1.integer)('updated_by').references(() => exports.users.id),
});
exports.insertEventSchema = (0, drizzle_zod_1.createInsertSchema)(exports.events).omit({
    id: true,
    createdAt: true,
}).extend({
    days: zod_1.z.number().min(1).max(365).default(1),
});
exports.insertSystemSettingsSchema = (0, drizzle_zod_1.createInsertSchema)(exports.systemSettings).omit({
    id: true,
    lastUpdated: true,
});
exports.insertCategorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.categories).omit({
    id: true,
});
