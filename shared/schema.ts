import {
  pgTable,
  text,
  serial,
  integer,
  date,
  time,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// User model for authentication
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(), // Changed username to email
  password: text('password').notNull(),
  name: text('name').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resetToken: text('reset_token'),
  resetTokenExpiry: text('reset_token_expiry'), // تغيير من date إلى text
  emailVerified: boolean('email_verified').default(false),
  verificationToken: text('verification_token'),
  lastLogin: timestamp('last_login'),
  accountLocked: boolean('account_locked').default(false),
  lockReason: text('lock_reason'),
});

export const insertUserSchema = createInsertSchema(users).pick({
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
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),

  hijriDay: integer('hijri_day'),
  hijriMonth: integer('hijri_month'),
  hijriYear: integer('hijri_year'),

  gregorianDay: integer('gregorian_day'),
  gregorianMonth: integer('gregorian_month'),
  gregorianYear: integer('gregorian_year'),
  isHijri: boolean('is_hijri').notNull().default(true),

  eventTime: time('event_time'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// System settings model
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  maintenanceMode: boolean('maintenance_mode').default(false).notNull(),
  maintenanceMessage: text('maintenance_message'),
  privacyPolicy: text('privacy_policy'),
  termsOfService: text('terms_of_service'),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  updatedBy: integer('updated_by').references(() => users.id),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingsSchema = createInsertSchema(
  systemSettings
).omit({
  id: true,
  lastUpdated: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;
