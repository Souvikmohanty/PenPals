import { ChevronRight, Flame, Plus, Sparkles, Star } from 'lucide-react';
import {
  CATEGORY_MAP,
  type AvatarColorKey,
  type AvatarKey,
  type CurrencyCode,
  type Expense,
} from '../types';
import {
  formatCents,
  formatFriendlyDate,
  getLastNDaysKeys,
  parseDateKey,
  type StreakResult,
} from '../utils/finance';
import { BudgetRing } from './BudgetRing';
import { CategoryIcon } from './BuddyAvatar';
import { buildCategorySlices, CategoryDonutChart } from './SpendingCharts';

interface TodayViewProps {
  userId: string;
  displayName: string;
  avatarKey: AvatarKey;
  avatarColor: AvatarColorKey;
  dailyBudgetCents: number;
  currency: CurrencyCode;
  todayKey: string;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  expenses: Expense[];
  streak: StreakResult;
  celebrationTick: number;
  onOpenLogger: () => void;
  onEditExpense: (expense: Expense) => void;
}

export function TodayView({
  userId,
  displayName,
  avatarKey,
  avatarColor,
  dailyBudgetCents,
  currency,
  todayKey,
  selectedDateKey,
  onSelectDate,
  expenses,
  streak,
  celebrationTick,
  onOpenLogger,
  onEditExpense,
}: TodayViewProps) {
  const myExpenses = expenses.filter((e) => e.authorId === userId);
  const selectedDayExpenses = myExpenses.filter((e) => e.dateKey === selectedDateKey);
  const spentOnSelectedDayCents = selectedDayExpenses.reduce(
    (sum, e) => sum + e.amountCents,
    0
  );
  const last7Days = getLastNDaysKeys(todayKey, 7);
  const isViewingToday = selectedDateKey === todayKey;

  const { totalCents: dayTotalCents, slices: daySlices } =
    buildCategorySlices(selectedDayExpenses);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Hero Daily Budget Ring & Streak */}
      <section className="lg:col-span-5 bg-white border border-[#E7EAF2] rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#687082]">
              {formatFriendlyDate(selectedDateKey, todayKey)}
            </p>
            <h1 className="font-display text-xl font-bold text-[#1A1D26]">
              Hi, {displayName.split(' ')[0]}
            </h1>
          </div>

          {!isViewingToday && (
            <button
              type="button"
              onClick={() => onSelectDate(todayKey)}
              className="min-h-[36px] px-3 rounded-xl bg-[#F7F8FB] hover:bg-[#ECEFF6] text-xs font-semibold text-[#1A1D26] transition-colors whitespace-nowrap shrink-0"
            >
              Back to Today
            </button>
          )}
        </div>

        <BudgetRing
          dailyBudgetCents={dailyBudgetCents}
          spentTodayCents={spentOnSelectedDayCents}
          currency={currency}
          loggedToday={isViewingToday ? streak.loggedToday : selectedDayExpenses.length > 0}
          avatarKey={avatarKey}
          avatarColor={avatarColor}
          celebrationTick={celebrationTick}
        />

        {/* Personal Streak Indicator + 7-Day History */}
        <div className="pt-2 border-t border-[#F1F3F8] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  streak.status === 'active'
                    ? 'bg-[#FEF3D6] text-[#D97706]'
                    : streak.status === 'at-risk'
                      ? 'bg-[#FFF0F2] text-[#FF5D73]'
                      : 'bg-[#F2F4F9] text-[#8E96A8]'
                }`}
              >
                {streak.status === 'active' ? (
                  <Flame className="w-5 h-5 fill-current" />
                ) : (
                  <Star className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="font-display text-base font-bold text-[#1A1D26] tabular-nums">
                  {streak.streakDays} {streak.streakDays === 1 ? 'day' : 'days'} streak
                </div>
                <div className="text-xs text-[#687082]">
                  {streak.status === 'active'
                    ? 'Logged today · Streak safe'
                    : streak.status === 'at-risk'
                      ? 'Waiting for today’s log'
                      : 'Log today to begin'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {last7Days.map((dayKey) => {
              const logged = streak.loggedDateKeys.has(dayKey);
              const d = parseDateKey(dayKey);
              const letter = d.toLocaleDateString('en-US', { weekday: 'narrow' });
              const isToday = dayKey === todayKey;
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => onSelectDate(dayKey)}
                  title={`${dayKey}${logged ? ' · Logged' : ''}`}
                  className={`py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                    dayKey === selectedDateKey
                      ? 'bg-[#F7F8FB] ring-1 ring-[#DCE1EC]'
                      : 'hover:bg-[#F7F8FB]'
                  }`}
                >
                  <span
                    className={`text-[11px] font-medium ${
                      isToday ? 'text-[#FF5D73] font-semibold' : 'text-[#687082]'
                    }`}
                  >
                    {letter}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      logged
                        ? 'bg-[#FEF3D6] text-[#D97706]'
                        : 'bg-[#F2F4F9] text-[#C5CCD9]'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${logged ? 'fill-current' : ''}`} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zero-Spend Day Friendly Nudge */}
        {isViewingToday && !streak.loggedToday && (
          <div className="rounded-2xl bg-[#FFF8EB] border border-[#FDE6BD] p-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-[#78350F] leading-relaxed">
                {streak.streakDays > 0
                  ? `Your budget is 100% intact today. Log one quick expense to keep your ${streak.streakDays}-day streak going!`
                  : 'Your daily budget is untouched. Log one quick expense today to kick off your personal streak.'}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenLogger}
          className="w-full h-12 px-5 rounded-2xl bg-[#FF5D73] hover:bg-[#EB4960] active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>
            {isViewingToday ? 'Log Expense' : `Log for ${formatFriendlyDate(selectedDateKey, todayKey)}`}
          </span>
        </button>
      </section>

      {/* Right Column: Date Scroller, Summary Metrics, Visual Breakdown & Expense Tap List */}
      <section className="lg:col-span-7 space-y-5">
        <div className="bg-white border border-[#E7EAF2] rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-semibold text-[#1A1D26]">
              Recent days
            </h2>
            <span className="text-xs text-[#687082]">Tap a day to review or edit</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {last7Days.map((dayKey) => {
              const d = parseDateKey(dayKey);
              const dayShort = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
              const dayNum = d.getDate();
              const isSelected = dayKey === selectedDateKey;
              const hasEntries = streak.loggedDateKeys.has(dayKey);

              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => onSelectDate(dayKey)}
                  className={`min-h-[58px] py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                    isSelected
                      ? 'bg-[#1A1D26] text-white'
                      : 'bg-[#F7F8FB] text-[#1A1D26] hover:bg-[#ECEFF6]'
                  }`}
                >
                  <span
                    className={`text-[11px] font-medium ${
                      isSelected ? 'text-white/75' : 'text-[#687082]'
                    }`}
                  >
                    {dayShort}
                  </span>
                  <span className="font-display text-sm font-bold tabular-nums">{dayNum}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      hasEntries
                        ? isSelected
                          ? 'bg-[#FF5D73]'
                          : 'bg-[#10B981]'
                        : 'bg-transparent'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Strip */}
        <div className="bg-white border border-[#E7EAF2] rounded-3xl px-5 py-4 grid grid-cols-3 divide-x divide-[#F1F3F8]">
          <div className="pr-3">
            <div className="text-xs text-[#687082]">Spent</div>
            <div className="font-display text-lg sm:text-xl font-bold text-[#1A1D26] tabular-nums mt-0.5">
              {formatCents(spentOnSelectedDayCents, currency)}
            </div>
          </div>
          <div className="px-3 sm:px-5">
            <div className="text-xs text-[#687082]">Daily cap</div>
            <div className="font-display text-lg sm:text-xl font-bold text-[#1A1D26] tabular-nums mt-0.5">
              {formatCents(dailyBudgetCents, currency, false)}
            </div>
          </div>
          <div className="pl-3 sm:pl-5">
            <div className="text-xs text-[#687082]">Entries</div>
            <div className="font-display text-lg sm:text-xl font-bold text-[#1A1D26] tabular-nums mt-0.5">
              {selectedDayExpenses.length}
            </div>
          </div>
        </div>

        {/* Visual Daily Category Graph */}
        {daySlices.length > 0 && (
          <div className="bg-white border border-[#E7EAF2] rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#1A1D26]">
                Where {formatFriendlyDate(selectedDateKey, todayKey).toLowerCase()}’s spend went
              </h2>
              <span className="text-xs text-[#687082]">Tap slice to inspect</span>
            </div>
            <CategoryDonutChart
              slices={daySlices}
              totalCents={dayTotalCents}
              currency={currency}
              centerLabel={formatFriendlyDate(selectedDateKey, todayKey)}
              size={172}
            />
          </div>
        )}

        {/* Expense List */}
        <div className="bg-white border border-[#E7EAF2] rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F1F3F8] flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#1A1D26]">
              {formatFriendlyDate(selectedDateKey, todayKey)}’s log
            </h2>
            <span className="text-xs text-[#687082]">Tap an item to edit</span>
          </div>

          {selectedDayExpenses.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-3">
              <p className="text-sm font-medium text-[#1A1D26]">
                No expenses logged for {formatFriendlyDate(selectedDateKey, todayKey).toLowerCase()}
              </p>
              <p className="text-xs text-[#687082] max-w-xs mx-auto">
                Tap Log Expense anytime you buy chai, groceries, or a meal to keep your streak moving.
              </p>
              <button
                type="button"
                onClick={onOpenLogger}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#FFF0F2] hover:bg-[#FFE2E7] text-[#FF5D73] text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add entry</span>
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#F1F3F8]">
              {selectedDayExpenses.map((exp) => {
                const cat = CATEGORY_MAP[exp.category] || CATEGORY_MAP.other;
                return (
                  <li key={exp.id}>
                    <button
                      type="button"
                      onClick={() => onEditExpense(exp)}
                      className="w-full min-h-[64px] px-5 py-3 flex items-center gap-3.5 text-left hover:bg-[#F9FAFC] active:bg-[#F2F4F9] transition-colors"
                    >
                      <CategoryIcon category={exp.category} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#1A1D26] truncate">
                          {exp.note || cat.label}
                        </div>
                        <div className="text-xs text-[#687082] flex items-center gap-1.5 truncate">
                          <span>{cat.label}</span>
                          {exp.createdAt && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">
                                {exp.createdAt.toDate().toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-display text-base font-bold text-[#1A1D26] tabular-nums">
                          {formatCents(exp.amountCents, currency)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#B5BCCB]" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
