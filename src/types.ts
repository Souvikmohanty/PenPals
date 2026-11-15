import type { Timestamp } from 'firebase/firestore';

export type ExpenseCategory =
  | 'coffee'
  | 'meals'
  | 'groceries'
  | 'transit'
  | 'fun'
  | 'home'
  | 'health'
  | 'other';

export type AvatarKey = 'piggy' | 'bear' | 'bunny' | 'cat' | 'star' | 'sprout';

export type AvatarColorKey =
  | 'coral'
  | 'mint'
  | 'sky'
  | 'lavender'
  | 'buttercup'
  | 'peach';

export type TrackingMode = 'individual' | 'group' | 'unset';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD' | 'AUD' | 'CAD';

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  defaultDailyBudgetMajor: number;
  budgetPresetsMajor: number[];
  quickLogPresetsMajor: number[];
}

export const CURRENCIES: CurrencyMeta[] = [
  {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN',
    defaultDailyBudgetMajor: 500,
    budgetPresetsMajor: [300, 500, 1000, 2000],
    quickLogPresetsMajor: [50, 100, 250, 500],
  },
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    defaultDailyBudgetMajor: 35,
    budgetPresetsMajor: [20, 35, 50, 75],
    quickLogPresetsMajor: [5, 12, 25],
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'en-IE',
    defaultDailyBudgetMajor: 35,
    budgetPresetsMajor: [20, 35, 50, 75],
    quickLogPresetsMajor: [5, 12, 25],
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    defaultDailyBudgetMajor: 30,
    budgetPresetsMajor: [20, 30, 50, 75],
    quickLogPresetsMajor: [5, 10, 20],
  },
  {
    code: 'AED',
    symbol: 'AED ',
    name: 'UAE Dirham',
    locale: 'en-AE',
    defaultDailyBudgetMajor: 150,
    budgetPresetsMajor: [100, 150, 250, 500],
    quickLogPresetsMajor: [20, 50, 100],
  },
  {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    locale: 'en-SG',
    defaultDailyBudgetMajor: 45,
    budgetPresetsMajor: [25, 45, 70, 100],
    quickLogPresetsMajor: [5, 15, 30],
  },
  {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    locale: 'en-AU',
    defaultDailyBudgetMajor: 50,
    budgetPresetsMajor: [30, 50, 80, 120],
    quickLogPresetsMajor: [8, 15, 30],
  },
  {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    locale: 'en-CA',
    defaultDailyBudgetMajor: 45,
    budgetPresetsMajor: [25, 45, 70, 100],
    quickLogPresetsMajor: [5, 15, 30],
  },
];

export const CURRENCY_MAP: Record<CurrencyCode, CurrencyMeta> = CURRENCIES.reduce(
  (acc, item) => {
    acc[item.code] = item;
    return acc;
  },
  {} as Record<CurrencyCode, CurrencyMeta>
);

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarColor: AvatarColorKey;
  avatarKey: AvatarKey;
  trackingMode: TrackingMode;
  currency: CurrencyCode;
  activeGroupId: string;
  dailyBudgetCents: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  currency: CurrencyCode;
  createdBy: string;
  memberIds: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface GroupMember {
  uid: string;
  groupId: string;
  displayName: string;
  avatarColor: AvatarColorKey;
  avatarKey: AvatarKey;
  dailyBudgetCents: number;
  joinedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Expense {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  amountCents: number;
  category: ExpenseCategory;
  note: string;
  dateKey: string; // YYYY-MM-DD local date
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CategoryMeta {
  id: ExpenseCategory;
  label: string;
  shortLabel: string;
  bgHex: string;
  inkHex: string;
  barHex: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'coffee',
    label: 'Chai, Coffee & Treats',
    shortLabel: 'Treats',
    bgHex: '#FEF3D6',
    inkHex: '#A16207',
    barHex: '#F59E0B',
  },
  {
    id: 'meals',
    label: 'Meals Out',
    shortLabel: 'Meals',
    bgHex: '#FFEAE0',
    inkHex: '#C2410C',
    barHex: '#FB7185',
  },
  {
    id: 'groceries',
    label: 'Groceries',
    shortLabel: 'Groceries',
    bgHex: '#DCF7EC',
    inkHex: '#0F766E',
    barHex: '#10B981',
  },
  {
    id: 'transit',
    label: 'Transit',
    shortLabel: 'Transit',
    bgHex: '#E2EEFF',
    inkHex: '#1D4ED8',
    barHex: '#3B82F6',
  },
  {
    id: 'fun',
    label: 'Fun & Gifts',
    shortLabel: 'Fun',
    bgHex: '#EFE9FE',
    inkHex: '#6D28D9',
    barHex: '#8B5CF6',
  },
  {
    id: 'home',
    label: 'Home & Bills',
    shortLabel: 'Home',
    bgHex: '#E8EEFA',
    inkHex: '#3730A3',
    barHex: '#6366F1',
  },
  {
    id: 'health',
    label: 'Health & Care',
    shortLabel: 'Health',
    bgHex: '#FFE6EE',
    inkHex: '#BE123C',
    barHex: '#F43F5E',
  },
  {
    id: 'other',
    label: 'Everyday Other',
    shortLabel: 'Other',
    bgHex: '#EDF0F5',
    inkHex: '#475569',
    barHex: '#64748B',
  },
];

export const CATEGORY_MAP: Record<ExpenseCategory, CategoryMeta> = CATEGORIES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ExpenseCategory, CategoryMeta>
);

export const AVATAR_COLORS: Record<
  AvatarColorKey,
  { label: string; bg: string; ring: string; ink: string }
> = {
  coral: { label: 'Coral', bg: '#FFE5E9', ring: '#FF5D73', ink: '#B91C3C' },
  mint: { label: 'Mint', bg: '#DCF7EC', ring: '#10B981', ink: '#047857' },
  sky: { label: 'Sky', bg: '#E0EEFF', ring: '#3B82F6', ink: '#1D4ED8' },
  lavender: { label: 'Lavender', bg: '#EFE9FE', ring: '#8B5CF6', ink: '#6D28D9' },
  buttercup: { label: 'Butter', bg: '#FEF3D6', ring: '#F59E0B', ink: '#B45309' },
  peach: { label: 'Peach', bg: '#FFEAE0', ring: '#F97316', ink: '#C2410C' },
};

export const AVATAR_KEYS: AvatarKey[] = ['piggy', 'bear', 'bunny', 'cat', 'star', 'sprout'];
