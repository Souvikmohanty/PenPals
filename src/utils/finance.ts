import {
  CATEGORIES,
  CURRENCY_MAP,
  type CurrencyCode,
  type Expense,
  type ExpenseCategory,
} from '../types';

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + deltaDays);
  return toLocalDateKey(d);
}

export function getLastNDaysKeys(endDateKey: string, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(addDaysToDateKey(endDateKey, -i));
  }
  return keys;
}

export function getMondayOfWeek(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const day = d.getDay(); // 0 = Sun, 1 = Mon...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return toLocalDateKey(d);
}

export function getWeekDateKeys(mondayKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToDateKey(mondayKey, i));
}

export function formatCents(
  cents: number,
  currency: CurrencyCode = 'INR',
  showDecimals = true
): string {
  const meta = CURRENCY_MAP[currency] || CURRENCY_MAP.INR;
  const abs = Math.abs(cents) / 100;
  const isWhole = cents % 100 === 0;
  const decimals = showDecimals && !(currency === 'INR' && isWhole) ? 2 : 0;
  const formatted = abs.toLocaleString(meta.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  return cents < 0 ? `-${meta.symbol}${formatted}` : `${meta.symbol}${formatted}`;
}

export function formatCompactCents(
  cents: number,
  currency: CurrencyCode = 'INR'
): string {
  const meta = CURRENCY_MAP[currency] || CURRENCY_MAP.INR;
  const val = cents / 100;
  if (Number.isInteger(val)) {
    return `${meta.symbol}${val.toLocaleString(meta.locale)}`;
  }
  return `${meta.symbol}${val.toLocaleString(meta.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatFriendlyDate(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return 'Today';
  if (dateKey === addDaysToDateKey(todayKey, -1)) return 'Yesterday';
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export interface StreakResult {
  streakDays: number;
  loggedToday: boolean;
  status: 'active' | 'at-risk' | 'idle';
  loggedDateKeys: Set<string>;
}

export function computeStreak(expenses: Expense[], userId: string, todayKey: string): StreakResult {
  const loggedDateKeys = new Set<string>();
  for (const exp of expenses) {
    if (exp.authorId === userId) {
      loggedDateKeys.add(exp.dateKey);
    }
  }

  const loggedToday = loggedDateKeys.has(todayKey);
  const yesterdayKey = addDaysToDateKey(todayKey, -1);

  if (loggedToday) {
    let count = 0;
    let cursor = todayKey;
    while (loggedDateKeys.has(cursor)) {
      count++;
      cursor = addDaysToDateKey(cursor, -1);
    }
    return { streakDays: count, loggedToday: true, status: 'active', loggedDateKeys };
  }

  if (loggedDateKeys.has(yesterdayKey)) {
    let count = 0;
    let cursor = yesterdayKey;
    while (loggedDateKeys.has(cursor)) {
      count++;
      cursor = addDaysToDateKey(cursor, -1);
    }
    return { streakDays: count, loggedToday: false, status: 'at-risk', loggedDateKeys };
  }

  return { streakDays: 0, loggedToday: false, status: 'idle', loggedDateKeys };
}

export interface DailyPoint {
  dateKey: string;
  dayShort: string;
  thisWeekCents: number;
  lastWeekCents: number;
}

export interface CategoryBreakdownItem {
  category: ExpenseCategory;
  totalCents: number;
  percentage: number;
  count: number;
}

export interface WeeklyInsightsData {
  thisWeekTotalCents: number;
  lastWeekTotalCents: number;
  deltaCents: number;
  deltaPercent: number | null;
  dailyAverageCents: number;
  daysElapsed: number;
  dailySeries: DailyPoint[];
  categoryBreakdown: CategoryBreakdownItem[];
  totalTransactions: number;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function computeWeeklyInsights(
  expenses: Expense[],
  todayKey: string,
  filterUserId?: string
): WeeklyInsightsData {
  const scoped = filterUserId
    ? expenses.filter((e) => e.authorId === filterUserId)
    : expenses;

  const thisMonday = getMondayOfWeek(todayKey);
  const lastMonday = addDaysToDateKey(thisMonday, -7);

  const thisWeekKeys = getWeekDateKeys(thisMonday);
  const lastWeekKeys = getWeekDateKeys(lastMonday);

  const thisWeekByDay: Record<string, number> = {};
  const lastWeekByDay: Record<string, number> = {};
  const catTotals: Record<ExpenseCategory, { cents: number; count: number }> = {
    coffee: { cents: 0, count: 0 },
    meals: { cents: 0, count: 0 },
    groceries: { cents: 0, count: 0 },
    transit: { cents: 0, count: 0 },
    fun: { cents: 0, count: 0 },
    home: { cents: 0, count: 0 },
    health: { cents: 0, count: 0 },
    other: { cents: 0, count: 0 },
  };

  let thisWeekTotalCents = 0;
  let lastWeekTotalCents = 0;
  let totalTransactions = 0;

  const thisWeekSet = new Set(thisWeekKeys);
  const lastWeekSet = new Set(lastWeekKeys);

  for (const exp of scoped) {
    if (thisWeekSet.has(exp.dateKey)) {
      thisWeekByDay[exp.dateKey] = (thisWeekByDay[exp.dateKey] || 0) + exp.amountCents;
      thisWeekTotalCents += exp.amountCents;
      totalTransactions++;
      catTotals[exp.category].cents += exp.amountCents;
      catTotals[exp.category].count += 1;
    } else if (lastWeekSet.has(exp.dateKey)) {
      lastWeekByDay[exp.dateKey] = (lastWeekByDay[exp.dateKey] || 0) + exp.amountCents;
      lastWeekTotalCents += exp.amountCents;
    }
  }

  const dailySeries: DailyPoint[] = thisWeekKeys.map((dateKey, idx) => ({
    dateKey,
    dayShort: DAY_LABELS[idx],
    thisWeekCents: thisWeekByDay[dateKey] || 0,
    lastWeekCents: lastWeekByDay[lastWeekKeys[idx]] || 0,
  }));

  const todayIdx = thisWeekKeys.indexOf(todayKey);
  const daysElapsed = todayIdx >= 0 ? todayIdx + 1 : 7;
  const dailyAverageCents = Math.round(thisWeekTotalCents / Math.max(1, daysElapsed));

  const deltaCents = thisWeekTotalCents - lastWeekTotalCents;
  const deltaPercent =
    lastWeekTotalCents > 0
      ? Math.round(((thisWeekTotalCents - lastWeekTotalCents) / lastWeekTotalCents) * 1000) / 10
      : null;

  const categoryBreakdown: CategoryBreakdownItem[] = CATEGORIES.map((cat) => {
    const entry = catTotals[cat.id];
    const percentage =
      thisWeekTotalCents > 0 ? Math.round((entry.cents / thisWeekTotalCents) * 100) : 0;
    return {
      category: cat.id,
      totalCents: entry.cents,
      percentage,
      count: entry.count,
    };
  })
    .filter((item) => item.totalCents > 0)
    .sort((a, b) => b.totalCents - a.totalCents);

  return {
    thisWeekTotalCents,
    lastWeekTotalCents,
    deltaCents,
    deltaPercent,
    dailyAverageCents,
    daysElapsed,
    dailySeries,
    categoryBreakdown,
    totalTransactions,
  };
}
