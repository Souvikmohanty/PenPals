import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useState } from 'react';
import {
  AVATAR_COLORS,
  CATEGORIES,
  CATEGORY_MAP,
  type CurrencyCode,
  type Expense,
  type ExpenseCategory,
  type GroupMember,
} from '../types';
import {
  addDaysToDateKey,
  computeWeeklyInsights,
  formatCents,
  formatCompactCents,
  getMondayOfWeek,
  getWeekDateKeys,
} from '../utils/finance';
import { BuddyAvatar } from './BuddyAvatar';
import { buildCategorySlices, CategoryDonutChart } from './SpendingCharts';

interface InsightsViewProps {
  currentUserId: string;
  currency: CurrencyCode;
  isGroupMode: boolean;
  members: GroupMember[];
  expenses: Expense[];
  todayKey: string;
  dailyBudgetCents: number;
}

export function InsightsView({
  currentUserId,
  currency,
  isGroupMode,
  members,
  expenses,
  todayKey,
  dailyBudgetCents,
}: InsightsViewProps) {
  const [timeframe, setTimeframe] = useState<'today' | 'week'>('today');
  const [scope, setScope] = useState<'personal' | 'group'>('personal');
  const [focusedDayIdx, setFocusedDayIdx] = useState<number | null>(null);

  const effectiveScope = isGroupMode ? scope : 'personal';

  const scopedExpenses =
    effectiveScope === 'personal'
      ? expenses.filter((e) => e.authorId === currentUserId)
      : expenses;

  const scopedDailyCapCents =
    effectiveScope === 'personal'
      ? dailyBudgetCents
      : members.reduce((sum, m) => sum + m.dailyBudgetCents, 0);

  // ---- Today Metrics & Visual Data ----
  const todayExpenses = scopedExpenses.filter((e) => e.dateKey === todayKey);
  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  const yesterdayExpenses = scopedExpenses.filter((e) => e.dateKey === yesterdayKey);

  const todayTotalCents = todayExpenses.reduce((s, e) => s + e.amountCents, 0);
  const yesterdayTotalCents = yesterdayExpenses.reduce((s, e) => s + e.amountCents, 0);
  const todayDeltaCents = todayTotalCents - yesterdayTotalCents;
  const todayDeltaPct =
    yesterdayTotalCents > 0
      ? Math.round((todayDeltaCents / yesterdayTotalCents) * 1000) / 10
      : null;

  const { totalCents: todaySliceTotal, slices: todaySlices } =
    buildCategorySlices(todayExpenses);

  // ---- Weekly Metrics & Stacked Category Series ----
  const insights = computeWeeklyInsights(
    expenses,
    todayKey,
    effectiveScope === 'personal' ? currentUserId : undefined
  );

  const thisMonday = getMondayOfWeek(todayKey);
  const thisWeekKeys = getWeekDateKeys(thisMonday);
  const thisWeekSet = new Set(thisWeekKeys);
  const thisWeekExpenses = scopedExpenses.filter((e) => thisWeekSet.has(e.dateKey));
  const { totalCents: weekSliceTotal, slices: weekSlices } =
    buildCategorySlices(thisWeekExpenses);

  // Per-day category stacks for the 7-day stacked bar chart
  const dayCategoryStacks = thisWeekKeys.map((dateKey) => {
    const dayItems = thisWeekExpenses.filter((e) => e.dateKey === dateKey);
    const byCat = new Map<ExpenseCategory, number>();
    for (const item of dayItems) {
      byCat.set(item.category, (byCat.get(item.category) || 0) + item.amountCents);
    }
    const segments = CATEGORIES.map((c) => ({
      category: c.id,
      label: c.shortLabel,
      color: c.barHex,
      cents: byCat.get(c.id) || 0,
    })).filter((s) => s.cents > 0);
    return segments;
  });

  const maxDayCents = Math.max(
    1000,
    scopedDailyCapCents,
    ...insights.dailySeries.map((d) => Math.max(d.thisWeekCents, d.lastWeekCents))
  );

  const focusedDay =
    focusedDayIdx !== null ? insights.dailySeries[focusedDayIdx] : null;
  const focusedDayStacks =
    focusedDayIdx !== null ? dayCategoryStacks[focusedDayIdx] : [];

  // ---- Group Member Spending Breakdown (for Group scope) ----
  const periodExpenses = timeframe === 'today' ? todayExpenses : thisWeekExpenses;
  const memberSpending = members
    .map((member) => {
      const mExpenses = periodExpenses.filter((e) => e.authorId === member.uid);
      const totalCents = mExpenses.reduce((s, e) => s + e.amountCents, 0);
      const { slices } = buildCategorySlices(mExpenses);
      const topCategory = slices[0] ? CATEGORY_MAP[slices[0].category].shortLabel : null;
      return {
        member,
        totalCents,
        count: mExpenses.length,
        topCategory,
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents);

  const maxMemberSpent = Math.max(
    1,
    ...memberSpending.map((m) => m.totalCents)
  );

  return (
    <div className="space-y-6">
      {/* Header + Timeframe & Scope Switches */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1A1D26]">
            Spending Insights
          </h1>
          <p className="text-sm text-[#687082]">
            Visual breakdown of where and how much {effectiveScope === 'group' ? 'your group' : 'you'} spent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1 p-1 bg-[#ECEFF6] rounded-2xl">
            <button
              type="button"
              onClick={() => setTimeframe('today')}
              className={`min-h-[40px] px-4 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                timeframe === 'today'
                  ? 'bg-white text-[#1A1D26] shadow-xs'
                  : 'text-[#687082] hover:text-[#1A1D26]'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('week')}
              className={`min-h-[40px] px-4 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                timeframe === 'week'
                  ? 'bg-white text-[#1A1D26] shadow-xs'
                  : 'text-[#687082] hover:text-[#1A1D26]'
              }`}
            >
              This Week
            </button>
          </div>

          {isGroupMode && (
            <div className="inline-flex items-center gap-1 p-1 bg-[#ECEFF6] rounded-2xl">
              <button
                type="button"
                onClick={() => setScope('personal')}
                className={`min-h-[40px] px-4 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  scope === 'personal'
                    ? 'bg-white text-[#1A1D26] shadow-xs'
                    : 'text-[#687082] hover:text-[#1A1D26]'
                }`}
              >
                My Spending
              </button>
              <button
                type="button"
                onClick={() => setScope('group')}
                className={`min-h-[40px] px-4 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  scope === 'group'
                    ? 'bg-white text-[#1A1D26] shadow-xs'
                    : 'text-[#687082] hover:text-[#1A1D26]'
                }`}
              >
                Group ({members.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      {timeframe === 'today' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E7EAF2] rounded-3xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#687082]">Spent today</div>
            <div className="font-display text-3xl font-bold text-[#1A1D26] tabular-nums">
              {formatCents(todayTotalCents, currency)}
            </div>
            <div className="text-xs text-[#687082] tabular-nums">
              {todayExpenses.length} {todayExpenses.length === 1 ? 'expense' : 'expenses'} logged
            </div>
          </div>

          <div className="bg-white border border-[#E7EAF2] rounded-3xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#687082]">vs Yesterday</div>
            <div className="flex items-center gap-2">
              {todayDeltaPct === null ? (
                <span className="font-display text-2xl font-bold text-[#1A1D26] tabular-nums">
                  {formatCents(todayTotalCents, currency)}
                </span>
              ) : (
                <span
                  className={`font-display text-3xl font-bold tabular-nums flex items-center gap-1 ${
                    todayDeltaCents <= 0 ? 'text-[#0F766E]' : 'text-[#BE123C]'
                  }`}
                >
                  {todayDeltaCents < 0 ? (
                    <ArrowDownRight className="w-6 h-6 shrink-0" />
                  ) : todayDeltaCents > 0 ? (
                    <ArrowUpRight className="w-6 h-6 shrink-0" />
                  ) : (
                    <Minus className="w-5 h-5 shrink-0" />
                  )}
                  <span>{Math.abs(todayDeltaPct)}%</span>
                </span>
              )}
            </div>
            <div className="text-xs text-[#687082] tabular-nums">
              {yesterdayTotalCents === 0
                ? 'No spending logged yesterday'
                : todayDeltaCents <= 0
                  ? `${formatCents(Math.abs(todayDeltaCents), currency)} less than yesterday (${formatCents(yesterdayTotalCents, currency)})`
                  : `${formatCents(todayDeltaCents, currency)} more than yesterday (${formatCents(yesterdayTotalCents, currency)})`}
            </div>
          </div>

          <div className="bg-white border border-[#E7EAF2] rounded-3xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#687082]">Top category today</div>
            <div className="font-display text-2xl font-bold text-[#1A1D26] truncate">
              {todaySlices[0]
                ? CATEGORY_MAP[todaySlices[0].category].shortLabel
                : 'None yet'}
            </div>
            <div className="text-xs text-[#687082] tabular-nums">
              {todaySlices[0]
                ? `${formatCents(todaySlices[0].totalCents, currency)} · ${todaySlices[0].percentage}% of today`
                : `Daily cap ${formatCompactCents(scopedDailyCapCents, currency)}`}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E7EAF2] rounded-3xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#687082]">This week spent</div>
            <div className="font-display text-3xl font-bold text-[#1A1D26] tabular-nums">
              {formatCents(insights.thisWeekTotalCents, currency)}
            </div>
            <div className="text-xs text-[#687082] tabular-nums">
              {insights.totalTransactions}{' '}
              {insights.totalTransactions === 1 ? 'expense' : 'expenses'} logged
            </div>
          </div>

          <div className="bg-white border border-[#E7EAF2] rounded-3xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#687082]">vs Last week</div>
            <div className="flex items-center gap-2">
              {insights.deltaPercent === null ? (
                <span className="font-display text-2xl font-bold text-[#1A1D26] tabular-nums">
                  {formatCents(insights.thisWeekTotalCents, currency)}
                </span>
              ) : (
                <span
                  className={`font-display text-3xl font-bold tabular-nums flex items-center gap-1 ${
                    insights.deltaCents <= 0 ? 'text-[#0F766E]' : 'text-[#BE123C]'
                  }`}
                >
                  {insights.deltaCents < 0 ? (
                    <ArrowDownRight className="w-6 h-6 shrink-0" />
                  ) : insights.deltaCents > 0 ? (
                    <ArrowUpRight className="w-6 h-6 shrink-0" />
                  ) : (
                    <Minus className="w-5 h-5 shrink-0" />
                  )}
                  <span>{Math.abs(insights.deltaPercent)}%</span>
                </span>
              )}
            </div>
            <div className="text-xs text-[#687082] tabular-nums">
              {insights.lastWeekTotalCents === 0
                ? 'No spending recorded last week'
                : insights.deltaCents <= 0
                  ? `${formatCents(Math.abs(insights.deltaCents), currency)} less than last week (${formatCents(insights.lastWeekTotalCents, currency)})`
                  : `${formatCents(insights.deltaCents, currency)} more than last week (${formatCents(insights.lastWeekTotalCents, currency)})`}
            </div>
          </div>

          <div className="bg-white border border-[#E7EAF2] rounded-3xl p-5 space-y-1">
            <div className="text-xs font-medium text-[#687082]">Daily average</div>
            <div className="font-display text-3xl font-bold text-[#1A1D26] tabular-nums">
              {formatCents(insights.dailyAverageCents, currency)}
            </div>
            <div className="text-xs text-[#687082] tabular-nums">
              Target cap {formatCompactCents(scopedDailyCapCents, currency)}/day
            </div>
          </div>
        </div>
      )}

      {/* Visual Graphs Section */}
      {timeframe === 'today' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Today Category Donut Graph */}
          <section className="lg:col-span-7 bg-white border border-[#E7EAF2] rounded-3xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#1A1D26]">
                  Where today’s money went
                </h2>
                <p className="text-xs text-[#687082]">
                  Tap or hover a slice to inspect category share
                </p>
              </div>
              <span className="text-xs font-medium text-[#687082] tabular-nums">
                Cap {formatCompactCents(scopedDailyCapCents, currency)}
              </span>
            </div>

            {todaySlices.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#687082]">
                No expenses logged today yet.
              </div>
            ) : (
              <CategoryDonutChart
                slices={todaySlices}
                totalCents={todaySliceTotal}
                currency={currency}
                centerLabel="Today"
                size={204}
              />
            )}
          </section>

          {/* Today vs Yesterday + Cap Progress / Group Member Graph */}
          <section className="lg:col-span-5 bg-white border border-[#E7EAF2] rounded-3xl p-5 sm:p-6 space-y-5">
            {effectiveScope === 'group' ? (
              <>
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#1A1D26]">
                    Who spent how much today
                  </h2>
                  <p className="text-xs text-[#687082]">
                    Side-by-side daily spend across members
                  </p>
                </div>

                <ul className="space-y-4">
                  {memberSpending.map(({ member, totalCents, count, topCategory }) => {
                    const palette = AVATAR_COLORS[member.avatarColor] || AVATAR_COLORS.coral;
                    const barPct =
                      totalCents > 0 ? Math.max(6, Math.round((totalCents / maxMemberSpent) * 100)) : 0;
                    return (
                      <li key={member.uid} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <BuddyAvatar
                              avatarKey={member.avatarKey}
                              colorKey={member.avatarColor}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#1A1D26] truncate">
                                {member.uid === currentUserId
                                  ? `${member.displayName} (You)`
                                  : member.displayName}
                              </div>
                              <div className="text-xs text-[#687082] truncate">
                                {count === 0
                                  ? 'No spend logged'
                                  : `${count} ${count === 1 ? 'entry' : 'entries'}${topCategory ? ` · Top: ${topCategory}` : ''}`}
                              </div>
                            </div>
                          </div>
                          <span className="font-display text-sm font-bold text-[#1A1D26] tabular-nums shrink-0">
                            {formatCents(totalCents, currency)}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-[#F2F4F9] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${barPct}%`,
                              backgroundColor: palette.ring,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <>
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#1A1D26]">
                    Today vs. Yesterday
                  </h2>
                  <p className="text-xs text-[#687082]">
                    Visual comparison against your {formatCompactCents(scopedDailyCapCents, currency)} daily cap
                  </p>
                </div>

                {(() => {
                  const maxCompare = Math.max(
                    100,
                    scopedDailyCapCents,
                    todayTotalCents,
                    yesterdayTotalCents
                  );
                  const todayPct = Math.round((todayTotalCents / maxCompare) * 100);
                  const yestPct = Math.round((yesterdayTotalCents / maxCompare) * 100);
                  const capPct = Math.round((scopedDailyCapCents / maxCompare) * 100);

                  return (
                    <div className="space-y-5 pt-1">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-[#1A1D26]">Today</span>
                          <span className="tabular-nums text-[#1A1D26]">
                            {formatCents(todayTotalCents, currency)}
                          </span>
                        </div>
                        <div className="h-7 rounded-xl bg-[#F2F4F9] overflow-hidden flex">
                          {todaySlices.map((slice) => {
                            const segPct =
                              maxCompare > 0
                                ? (slice.totalCents / maxCompare) * 100
                                : 0;
                            const meta = CATEGORY_MAP[slice.category] || CATEGORY_MAP.other;
                            return (
                              <div
                                key={slice.category}
                                style={{
                                  width: `${segPct}%`,
                                  backgroundColor: meta.barHex,
                                }}
                                title={`${meta.label}: ${formatCents(slice.totalCents, currency)}`}
                                className="h-full transition-all duration-300"
                              />
                            );
                          })}
                          {todayTotalCents === 0 && (
                            <div style={{ width: `${todayPct}%` }} className="h-full" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-[#687082]">Yesterday</span>
                          <span className="tabular-nums text-[#687082]">
                            {formatCents(yesterdayTotalCents, currency)}
                          </span>
                        </div>
                        <div className="h-7 rounded-xl bg-[#F2F4F9] overflow-hidden">
                          <div
                            className="h-full rounded-xl bg-[#CBD5E1] transition-all duration-300"
                            style={{ width: `${yestPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-[#687082]">Daily Budget Cap</span>
                          <span className="tabular-nums text-[#687082]">
                            {formatCents(scopedDailyCapCents, currency, false)}
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-[#F2F4F9] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#10B981]/60"
                            style={{ width: `${capPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Stacked Category Daily Trend Chart */}
            <section className="lg:col-span-7 bg-white border border-[#E7EAF2] rounded-3xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#1A1D26]">
                    Daily spending &amp; category mix
                  </h2>
                  <p className="text-xs text-[#687082]">
                    {focusedDay
                      ? `${focusedDay.dayShort}: ${formatCents(focusedDay.thisWeekCents, currency)} this week · ${formatCents(focusedDay.lastWeekCents, currency)} last week`
                      : 'Stacked bars show what you spent on each day'}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-[#687082]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#FF5D73]" />
                    <span>This week (by category)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#DCE1EC]" />
                    <span>Last week</span>
                  </div>
                </div>
              </div>

              <div className="relative pt-4">
                {scopedDailyCapCents > 0 && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-[#CBD5E1] flex justify-end"
                    style={{
                      bottom: `${Math.min(92, Math.max(12, (scopedDailyCapCents / maxDayCents) * 100 * 0.78)) + 28}px`,
                    }}
                  >
                    <span className="text-[10px] font-medium text-[#687082] bg-white px-1.5 -mt-2 tabular-nums">
                      Cap {formatCompactCents(scopedDailyCapCents, currency)}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-7 gap-2 sm:gap-3 h-52 items-end">
                  {insights.dailySeries.map((day, idx) => {
                    const thisH = Math.max(
                      day.thisWeekCents > 0 ? 8 : 2,
                      Math.round((day.thisWeekCents / maxDayCents) * 164)
                    );
                    const lastH = Math.max(
                      day.lastWeekCents > 0 ? 6 : 2,
                      Math.round((day.lastWeekCents / maxDayCents) * 164)
                    );
                    const stacks = dayCategoryStacks[idx] || [];
                    const isToday = day.dateKey === todayKey;
                    const isFocused = focusedDayIdx === idx;

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onMouseEnter={() => setFocusedDayIdx(idx)}
                        onMouseLeave={() => setFocusedDayIdx(null)}
                        onClick={() =>
                          setFocusedDayIdx((prev) => (prev === idx ? null : idx))
                        }
                        className={`flex flex-col items-center justify-end h-full rounded-2xl px-1 pt-2 pb-1 transition-colors ${
                          isFocused ? 'bg-[#F7F8FB]' : 'hover:bg-[#F7F8FB]/70'
                        }`}
                      >
                        <div className="flex items-end justify-center gap-1 sm:gap-1.5 w-full flex-1 pb-2">
                          {/* Last week bar */}
                          <div
                            className="w-2.5 sm:w-3.5 rounded-t-md bg-[#DCE1EC] transition-all duration-300"
                            style={{ height: `${lastH}px` }}
                            title={`Last week ${day.dayShort}: ${formatCents(day.lastWeekCents, currency)}`}
                          />
                          {/* This week stacked category bar */}
                          <div
                            className="w-3 sm:w-4 rounded-t-md overflow-hidden flex flex-col-reverse bg-[#F1F3F8] transition-all duration-300"
                            style={{ height: `${thisH}px` }}
                          >
                            {day.thisWeekCents > 0 &&
                              stacks.map((seg) => {
                                const segPct = (seg.cents / day.thisWeekCents) * 100;
                                return (
                                  <div
                                    key={seg.category}
                                    style={{
                                      height: `${segPct}%`,
                                      backgroundColor: seg.color,
                                    }}
                                    title={`${seg.label}: ${formatCents(seg.cents, currency)}`}
                                  />
                                );
                              })}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            isToday ? 'text-[#FF5D73] font-bold' : 'text-[#687082]'
                          }`}
                        >
                          {day.dayShort}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Focused Day Category Breakdown Chips */}
              {focusedDay && focusedDayStacks.length > 0 && (
                <div className="pt-3 border-t border-[#F1F3F8] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#475569]">
                  {focusedDayStacks.map((seg) => (
                    <div key={seg.category} className="flex items-center gap-1.5 tabular-nums">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span>{seg.label}:</span>
                      <span className="font-semibold text-[#1A1D26]">
                        {formatCents(seg.cents, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Weekly Category Donut Graph */}
            <section className="lg:col-span-5 bg-white border border-[#E7EAF2] rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#1A1D26]">
                    Where it went this week
                  </h2>
                  <p className="text-xs text-[#687082]">Share by category</p>
                </div>
              </div>

              {weekSlices.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#687082]">
                  No expenses logged this week yet.
                </div>
              ) : (
                <CategoryDonutChart
                  slices={weekSlices}
                  totalCents={weekSliceTotal}
                  currency={currency}
                  centerLabel="This week"
                  size={172}
                />
              )}
            </section>
          </div>

          {/* Group Member Comparison Bar Graph for the Week */}
          {effectiveScope === 'group' && (
            <section className="bg-white border border-[#E7EAF2] rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#1A1D26]">
                    Member spending this week
                  </h2>
                  <p className="text-xs text-[#687082]">
                    Total logged and top spending category per person
                  </p>
                </div>
              </div>

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {memberSpending.map(({ member, totalCents, count, topCategory }) => {
                  const palette = AVATAR_COLORS[member.avatarColor] || AVATAR_COLORS.coral;
                  const barPct =
                    totalCents > 0
                      ? Math.max(6, Math.round((totalCents / maxMemberSpent) * 100))
                      : 0;

                  return (
                    <li
                      key={member.uid}
                      className="rounded-2xl bg-[#F7F8FB] p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BuddyAvatar
                            avatarKey={member.avatarKey}
                            colorKey={member.avatarColor}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#1A1D26] truncate">
                              {member.uid === currentUserId
                                ? `${member.displayName} (You)`
                                : member.displayName}
                            </div>
                            <div className="text-xs text-[#687082] truncate">
                              {count === 0
                                ? 'No spend logged'
                                : `${count} ${count === 1 ? 'entry' : 'entries'}${topCategory ? ` · Top: ${topCategory}` : ''}`}
                            </div>
                          </div>
                        </div>
                        <span className="font-display text-base font-bold text-[#1A1D26] tabular-nums shrink-0">
                          {formatCents(totalCents, currency)}
                        </span>
                      </div>

                      <div className="h-2.5 rounded-full bg-white overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${barPct}%`,
                            backgroundColor: palette.ring,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
