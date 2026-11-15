import { useState } from 'react';
import { CATEGORY_MAP, type CurrencyCode, type Expense, type ExpenseCategory } from '../types';
import { formatCents } from '../utils/finance';
import { CategoryIcon } from './BuddyAvatar';

export interface CategorySlice {
  category: ExpenseCategory;
  totalCents: number;
  percentage: number;
  count: number;
}

export function buildCategorySlices(expenses: Expense[]): {
  totalCents: number;
  slices: CategorySlice[];
} {
  const totals = new Map<ExpenseCategory, { cents: number; count: number }>();
  let totalCents = 0;

  for (const exp of expenses) {
    totalCents += exp.amountCents;
    const prev = totals.get(exp.category) || { cents: 0, count: 0 };
    totals.set(exp.category, {
      cents: prev.cents + exp.amountCents,
      count: prev.count + 1,
    });
  }

  const slices: CategorySlice[] = Array.from(totals.entries())
    .map(([category, info]) => ({
      category,
      totalCents: info.cents,
      percentage: totalCents > 0 ? Math.round((info.cents / totalCents) * 100) : 0,
      count: info.count,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  return { totalCents, slices };
}

interface CategoryDonutChartProps {
  slices: CategorySlice[];
  totalCents: number;
  currency: CurrencyCode;
  centerLabel?: string;
  size?: number;
}

export function CategoryDonutChart({
  slices,
  totalCents,
  currency,
  centerLabel = 'Total spent',
  size = 200,
}: CategoryDonutChartProps) {
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | null>(null);

  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Build cumulative arc segments
  let cumulativeRatio = 0;
  const segments = slices.map((slice) => {
    const ratio = totalCents > 0 ? slice.totalCents / totalCents : 0;
    const gap = slices.length > 1 ? 0.012 : 0;
    const visibleRatio = Math.max(0.015, ratio - gap);
    const dashLength = visibleRatio * circumference;
    const dashOffset = -cumulativeRatio * circumference;
    cumulativeRatio += ratio;
    const meta = CATEGORY_MAP[slice.category] || CATEGORY_MAP.other;
    return {
      ...slice,
      dashLength,
      dashOffset,
      color: meta.barHex,
      label: meta.shortLabel,
      fullLabel: meta.label,
    };
  });

  const activeSlice = activeCategory
    ? segments.find((s) => s.category === activeCategory) || null
    : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* SVG Donut */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`Spending breakdown totaling ${formatCents(totalCents, currency)}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EEF1F7"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg) => {
            const isActive = activeCategory === seg.category;
            const dimmed = activeCategory !== null && !isActive;
            return (
              <circle
                key={seg.category}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${seg.dashLength} ${circumference}`}
                strokeDashoffset={seg.dashOffset}
                opacity={dimmed ? 0.35 : 1}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setActiveCategory(seg.category)}
                onMouseLeave={() => setActiveCategory(null)}
                onClick={() =>
                  setActiveCategory((prev) =>
                    prev === seg.category ? null : seg.category
                  )
                }
              />
            );
          })}
        </svg>

        {/* Center Readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <span className="text-[11px] font-medium text-[#687082] truncate max-w-full">
            {activeSlice ? activeSlice.fullLabel : centerLabel}
          </span>
          <span className="font-display text-2xl font-bold text-[#1A1D26] tabular-nums mt-0.5">
            {activeSlice
              ? formatCents(activeSlice.totalCents, currency)
              : formatCents(totalCents, currency)}
          </span>
          {activeSlice && (
            <span className="text-xs font-semibold text-[#687082] tabular-nums mt-0.5">
              {activeSlice.percentage}% of spend
            </span>
          )}
        </div>
      </div>

      {/* Interactive Category Legend + Proportional Bars */}
      <ul className="w-full flex-1 space-y-2.5">
        {segments.map((seg) => {
          const isActive = activeCategory === seg.category;
          return (
            <li key={seg.category}>
              <button
                type="button"
                onMouseEnter={() => setActiveCategory(seg.category)}
                onMouseLeave={() => setActiveCategory(null)}
                onClick={() =>
                  setActiveCategory((prev) =>
                    prev === seg.category ? null : seg.category
                  )
                }
                className={`w-full text-left rounded-2xl px-3 py-2 transition-colors ${
                  isActive ? 'bg-[#F7F8FB]' : 'hover:bg-[#F7F8FB]/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryIcon category={seg.category} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1A1D26] truncate">
                        {seg.fullLabel}
                      </div>
                      <div className="text-xs text-[#687082] tabular-nums">
                        {seg.count} {seg.count === 1 ? 'entry' : 'entries'} · {seg.percentage}%
                      </div>
                    </div>
                  </div>

                  <span className="font-display text-sm font-bold text-[#1A1D26] tabular-nums shrink-0">
                    {formatCents(seg.totalCents, currency)}
                  </span>
                </div>

                <div className="mt-1.5 h-1.5 rounded-full bg-[#F1F3F8] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(4, seg.percentage)}%`,
                      backgroundColor: seg.color,
                    }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
