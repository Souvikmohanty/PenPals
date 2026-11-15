import { AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AVATAR_COLORS,
  type AvatarColorKey,
  type AvatarKey,
  type CurrencyCode,
} from '../types';
import { formatCents } from '../utils/finance';
import { BuddyIllustration } from './BuddyAvatar';

interface BudgetRingProps {
  dailyBudgetCents: number;
  spentTodayCents: number;
  currency: CurrencyCode;
  loggedToday: boolean;
  avatarKey: AvatarKey;
  avatarColor: AvatarColorKey;
  celebrationTick: number;
}

const BURST_PARTICLES = [
  { angle: -75, dist: 122, color: '#FF5D73', size: 10 },
  { angle: -35, dist: 132, color: '#F59E0B', size: 8 },
  { angle: 10, dist: 125, color: '#10B981', size: 9 },
  { angle: 50, dist: 130, color: '#3B82F6', size: 8 },
  { angle: 130, dist: 125, color: '#8B5CF6', size: 9 },
  { angle: 170, dist: 130, color: '#FF5D73', size: 8 },
  { angle: 215, dist: 124, color: '#10B981', size: 10 },
  { angle: 255, dist: 130, color: '#F59E0B', size: 8 },
];

export function BudgetRing({
  dailyBudgetCents,
  spentTodayCents,
  currency,
  loggedToday,
  avatarKey,
  avatarColor,
  celebrationTick,
}: BudgetRingProps) {
  const remainingCents = dailyBudgetCents - spentTodayCents;
  const isOverBudget = remainingCents < 0;
  const remainingRatio = Math.max(
    0,
    Math.min(1, dailyBudgetCents > 0 ? remainingCents / dailyBudgetCents : 0)
  );

  const size = 236;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - remainingRatio);

  const mood: 'happy' | 'curious' | 'focused' | 'surprised' = isOverBudget
    ? 'surprised'
    : !loggedToday
      ? 'curious'
      : remainingRatio <= 0.25
        ? 'focused'
        : 'happy';

  const ringColor = isOverBudget
    ? '#E11D48'
    : remainingRatio <= 0.25
      ? '#F59E0B'
      : '#FF5D73';

  const trackColor = isOverBudget ? '#FFE4E8' : '#EEF1F7';
  const palette = AVATAR_COLORS[avatarColor] || AVATAR_COLORS.coral;

  return (
    <div className="relative flex flex-col items-center justify-center py-2">
      {/* Celebration starburst animation on expense log */}
      <AnimatePresence>
        {celebrationTick > 0 && (
          <motion.div
            key={celebrationTick}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            aria-hidden="true"
          >
            {BURST_PARTICLES.map((p, idx) => {
              const rad = (p.angle * Math.PI) / 180;
              const x = Math.cos(rad) * p.dist;
              const y = Math.sin(rad) * p.dist;
              return (
                <motion.span
                  key={idx}
                  className="absolute rounded-full"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                  }}
                  initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                  animate={{ x, y, scale: 1.15, opacity: 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="relative flex items-center justify-center"
        animate={celebrationTick > 0 ? { scale: [1, 1.035, 1] } : { scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={
            isOverBudget
              ? `Over daily budget by ${formatCents(Math.abs(remainingCents), currency)}`
              : `${formatCents(remainingCents, currency)} remaining of ${formatCents(dailyBudgetCents, currency)} daily budget`
          }
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.8 }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center mb-1.5"
            style={{ backgroundColor: palette.bg, color: palette.ink }}
          >
            <BuddyIllustration avatarKey={avatarKey} mood={mood} className="w-7 h-7" />
          </div>

          <span className="text-xs font-medium text-[#687082]">
            {isOverBudget ? 'Over budget by' : 'Left for today'}
          </span>

          <div
            className={`font-display text-3xl sm:text-4xl font-bold tracking-tight tabular-nums mt-0.5 ${
              isOverBudget ? 'text-[#BE123C]' : 'text-[#1A1D26]'
            }`}
          >
            {isOverBudget
              ? formatCents(Math.abs(remainingCents), currency)
              : formatCents(remainingCents, currency)}
          </div>

          {isOverBudget ? (
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-[#BE123C]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="tabular-nums">
                Daily cap {formatCents(dailyBudgetCents, currency, false)}
              </span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-[#687082] tabular-nums">
              of {formatCents(dailyBudgetCents, currency, false)} daily budget
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
