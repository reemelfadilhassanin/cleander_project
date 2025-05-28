import {
  users,
  events,
  systemSettings,
  type User,
  type InsertUser,
  type Event,
  type SystemSettings,
  type InsertSystemSettings,
} from '@shared/schema';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { db } from './db';
import { pool } from './db';
import { eq, desc, sql } from 'drizzle-orm';

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(
    userId: number,
    userData: Partial<Omit<InsertUser, 'password'>>
  ): Promise<boolean>;
  deleteUser(userId: number): Promise<boolean>;
  setLastLogin(userId: number): Promise<boolean>;
  lockUserAccount(userId: number, reason?: string): Promise<boolean>;
  unlockUserAccount(userId: number): Promise<boolean>;

  // Password and verification operations
  setResetToken(email: string, token: string, expiryDate: Date): Promise<boolean>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  updateUserPassword(userId: number, newPassword: string): Promise<boolean>;
  clearResetToken(userId: number): Promise<boolean>;

  // Email verification functions
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  verifyUserEmail(userId: number): Promise<boolean>;
  updateVerificationToken(userId: number, token: string): Promise<boolean>;

  // User events
  getUserEvents(userId: number): Promise<Event[]>;
  getEventById(eventId: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>; // ✅ Added here

  // System settings
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(settings: Partial<InsertSystemSettings>, updatedBy: number): Promise<boolean>;
  setMaintenanceMode(
    enabled: boolean,
    message: string | undefined | null,
    updatedBy: number
  ): Promise<boolean>;
  updateTermsOfService(content: string, updatedBy: number): Promise<boolean>;
  updatePrivacyPolicy(content: string, updatedBy: number): Promise<boolean>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'user_sessions',
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          password: users.password,
          name: users.name,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          resetToken: users.resetToken,
          resetTokenExpiry: users.resetTokenExpiry,
          verificationToken: users.verificationToken,
          lastLogin: sql`NULL`.as<null>(),
          accountLocked: sql`FALSE`.as<boolean>(),
          lockReason: sql`NULL`.as<null>(),
        })
        .from(users)
        .where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('خطأ في الحصول على المستخدم:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          password: users.password,
          name: users.name,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          resetToken: users.resetToken,
          resetTokenExpiry: users.resetTokenExpiry,
          verificationToken: users.verificationToken,
          lastLogin: sql`NULL`.as<null>(),
          accountLocked: sql`FALSE`.as<boolean>(),
          lockReason: sql`NULL`.as<null>(),
        })
        .from(users)
        .where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('خطأ في الحصول على المستخدم بواسطة البريد الإلكتروني:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db
        .select({
          id: users.id,
          email: users.email,
          password: users.password,
          name: users.name,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          resetToken: users.resetToken,
          resetTokenExpiry: users.resetTokenExpiry,
          verificationToken: users.verificationToken,
          lastLogin: sql`NULL`.as<null>(),
          accountLocked: sql`FALSE`.as<boolean>(),
          lockReason: sql`NULL`.as<null>(),
        })
        .from(users);
    } catch (error) {
      console.error('خطأ في الحصول على جميع المستخدمين:', error);
      return [];
    }
  }

  async setResetToken(email: string, token: string, expiryDate: Date): Promise<boolean> {
    try {
      const formattedDate = expiryDate.toISOString();
      const result = await db
        .update(users)
        .set({ resetToken: token, resetTokenExpiry: formattedDate })
        .where(eq(users.email, email))
        .returning({ id: users.id });
      return result.length > 0;
    } catch (error) {
      console.error('خطأ عند تعيين رمز إعادة تعيين كلمة المرور:', error);
      return false;
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const today = new Date();
      const [user] = await db.select().from(users).where(eq(users.resetToken, token));
      if (user && user.resetTokenExpiry) {
        const expiryDate = new Date(user.resetTokenExpiry);
        if (expiryDate > today) return user;
      }
      return undefined;
    } catch (error) {
      console.error('خطأ عند البحث عن المستخدم برمز إعادة التعيين:', error);
      return undefined;
    }
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({ password: newPassword })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      return result.length > 0;
    } catch (error) {
      console.error('خطأ عند تحديث كلمة المرور:', error);
      return false;
    }
  }

  async clearResetToken(userId: number): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({ resetToken: null, resetTokenExpiry: null })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      return result.length > 0;
    } catch (error) {
      console.error('خطأ عند مسح رمز إعادة التعيين:', error);
      return false;
    }
  }

  async updateUser(userId: number, userData: Partial<Omit<InsertUser, 'password'>>): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      return result.length > 0;
    } catch (error) {
      console.error('خطأ في تحديث بيانات المستخدم:', error);
      return false;
    }
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      return result.length > 0;
    } catch (error) {
      console.error('خطأ في حذف المستخدم:', error);
      return false;
    }
  }

  async setLastLogin(userId: number): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({ lastLogin: sql`CURRENT_TIMESTAMP` })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      return result.length > 0;
    } catch (error) {
      console.error('خطأ في تحديث وقت آخر تسجيل دخول:', error);
      return false;
    }
  }

  async lockUserAccount(userId: number, reason?: string): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({ accountLocked: true, lockReason: reason || null })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      return result.length > 0;
    } catch (error) {
      console.error('خطأ في قفل حساب المستخدم:', error);
      return false;
    }
  }

  async unlockUserAccount(userId: number): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({ accountLocked: false, lockReason: null })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      return result.length > 0;
    } catch (error) {
      console.error('خطأ في إلغاء قفل حساب المستخدم:', error);
      return false;
    }
  }

  async getUserEvents(userId: number): Promise<Event[]> {
    try {
      return await db
        .select()
        .from(events)
        .where(eq(events.userId, userId))
        .orderBy(desc(events.createdAt));
    } catch (error) {
      console.error('خطأ في استرجاع مناسبات المستخدم:', error);
      return [];
    }
  }

  async getEventById(eventId: number): Promise<Event | undefined> {
    try {
      const [event] = await db.select().from(events).where(eq(events.id, eventId));
      return event;
    } catch (error) {
      console.error('خطأ في استرجاع المناسبة:', error);
      return undefined;
    }
  }

  async getAllEvents(): Promise<Event[]> {
    try {
      return await db
        .select()
        .from(events)
        .orderBy(desc(events.createdAt));
    } catch (error) {
      console.error('خطأ في استرجاع جميع المناسبات:', error);
      return [];
    }
  }

  async getSystemSettings(): Promise<SystemSettings | undefined> {
    try {
      const [settings] = await db
        .select()
        .from(systemSettings)
        .orderBy(desc(systemSettings.lastUpdated))
        .limit(1);
      return settings;
    } catch (error) {
      console.error('خطأ في استرجاع إعدادات النظام:', error);
      return undefined;
    }
  }

  async updateSystemSettings(settings: Partial<InsertSystemSettings>, updatedBy: number): Promise<boolean> {
    try {
      const currentSettings = await this.getSystemSettings();
      if (currentSettings) {
        const result = await db
          .update(systemSettings)
          .set({ ...settings, updatedBy, lastUpdated: sql`CURRENT_TIMESTAMP` })
          .where(eq(systemSettings.id, currentSettings.id))
          .returning({ id: systemSettings.id });
        return result.length > 0;
      } else {
        const [newSettings] = await db
          .insert(systemSettings)
          .values({ ...(settings as any), updatedBy, lastUpdated: new Date() })
          .returning({ id: systemSettings.id });
        return !!newSettings;
      }
    } catch (error) {
      console.error('خطأ في تحديث إعدادات النظام:', error);
      return false;
    }
  }

  async setMaintenanceMode(
    enabled: boolean,
    message: string | undefined | null,
    updatedBy: number
  ): Promise<boolean> {
    try {
      return this.updateSystemSettings(
        { maintenanceMode: enabled, maintenanceMessage: message },
        updatedBy
      );
    } catch (error) {
      console.error('خطأ في تغيير وضع الصيانة:', error);
      return false;
    }
  }

  async updateTermsOfService(content: string, updatedBy: number): Promise<boolean> {
    try {
      return this.updateSystemSettings({ termsOfService: content }, updatedBy);
    } catch (error) {
      console.error('خطأ في تحديث شروط الاستخدام:', error);
      return false;
    }
  }

  async updatePrivacyPolicy(content: string, updatedBy: number): Promise<boolean> {
    try {
      return this.updateSystemSettings({ privacyPolicy: content }, updatedBy);
    } catch (error) {
      console.error('خطأ في تحديث سياسة الخصوصية:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();
