

export interface User {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  emailVerified: boolean;
  lastLogin?: string;
  accountLocked: boolean;
  lockReason?: string;
}

export interface InsertUser {
  email: string;
  password: string;
  name: string;
  isAdmin?: boolean;
  emailVerified?: boolean;
  verificationToken?: string;
  accountLocked?: boolean;
  lockReason?: string;
}

export interface Event {
  id: number;
  userId: number;
  title: string;
  description?: string;
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  gregorianDay: number;
  gregorianMonth: number;
  gregorianYear: number;
  eventTime?: string;
  createdAt: string;
}

export interface InsertEvent {
  userId: number;
  title: string;
  description?: string;
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  gregorianDay: number;
  gregorianMonth: number;
  gregorianYear: number;
  eventTime?: string;
}

export interface SystemSettings {
  id: number;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  privacyPolicy?: string;
  termsOfService?: string;
  lastUpdated: string;
  updatedBy?: number;
}

export interface InsertSystemSettings {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  privacyPolicy?: string;
  termsOfService?: string;
  updatedBy?: number;
}
