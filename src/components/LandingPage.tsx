import {
  ArrowDown,
  ArrowRight,
  Check,
  Flame,
  RotateCcw,
  Sparkles,
  Star,
  User as UserIcon,
  Users,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { useRef, useState } from 'react';
import {
  AVATAR_COLORS,
  CATEGORY_MAP,
  type AvatarColorKey,
  type AvatarKey,
  type ExpenseCategory,
} from '../types';
import { BuddyAvatar, BuddyIllustration, CategoryIcon } from './BuddyAvatar';
import { CategoryDonutChart, type CategorySlice } from './SpendingCharts';

interface LandingPageProps {
  onSignIn: () => Promise<void>;
  signingIn: boolean;
  errorMsg: string | null;
}

const DEMO_ITEMS: { label: string; amount: number; category: ExpenseCategory }[] = [
  { label: 'Chai & snack', amount: 60, category: 'coffee' },
  { label: 'Lunch bowl', amount: 180, category: 'meals' },
  { label: 'Auto ride', amount: 90, category: 'transit' },
  { label: 'Fruit & milk', amount: 140, category: 'groceries' },
];

const LEAK_ITEMS: {
  id: string;
  category: ExpenseCategory;
  label: string;
  amount: number;
}[] = [
  { id: 'chai', category: 'coffee', label: 'Morning chai & bun', amount: 60 },
  { id: 'ride', category: 'transit', label: 'Metro & auto ride', amount: 120 },
  { id: 'lunch', category: 'meals', label: 'Afternoon lunch', amount: 190 },
  { id: 'snack', category: 'fun', label: 'Evening treat', amount: 80 },
];

const ALL_BUDDIES: {
  key: AvatarKey;
  color: AvatarColorKey;
  name: string;
  tagline: string;
}[] = [
  { key: 'piggy', color: 'coral', name: 'Piggy', tagline: 'Keeps your ₹500 cap cozy' },
  { key: 'bear', color: 'buttercup', name: 'Bear', tagline: 'Loves calm weekend budgets' },
  { key: 'bunny', color: 'lavender', name: 'Bunny', tagline: 'Fast two-tap coffee logger' },
  { key: 'cat', color: 'sky', name: 'Cat', tagline: 'Spots sneaky auto rides' },
  { key: 'star', color: 'peach', name: 'Star', tagline: 'Cheers every daily check-in' },
  { key: 'sprout', color: 'mint', name: 'Sprout', tagline: 'Grows 7-day streaks gently' },
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function LandingPage({ onSignIn, signingIn, errorMsg }: LandingPageProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 26,
    restDelta: 0.001,
  });

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroVisualY = useTransform(heroScroll, [0, 1], [0, 28]);

  const [imgFailed, setImgFailed] = useState(false);

  // Interactive 01: Everyday Leak Calculator
  const [selectedLeaks, setSelectedLeaks] = useState<Record<string, boolean>>({
    chai: true,
    ride: true,
    lunch: true,
    snack: false,
  });

  const dailyLeakTotal = LEAK_ITEMS.reduce(
    (sum, item) => sum + (selectedLeaks[item.id] ? item.amount : 0),
    0
  );
  const monthlyLeakTotal = dailyLeakTotal * 30;

  // Interactive 02: Interactive 7-Day Streak Builder
  const [streakChecks, setStreakChecks] = useState<boolean[]>([
    true,
    true,
    true,
    true,
    true,
    false,
    false,
  ]);
  const computedStreak = (() => {
    let best = 0;
    let current = 0;
    for (const checked of streakChecks) {
      if (checked) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    return best;
  })();

  // Interactive 03: Live Budget Ring + Category Donut Playground
  const [demoCap, setDemoCap] = useState<number>(500);
  const [demoCounts, setDemoCounts] = useState<Record<string, number>>({
    'Chai & snack': 1,
    'Lunch bowl': 0,
    'Auto ride': 1,
    'Fruit & milk': 0,
  });
  const [demoBurstTick, setDemoBurstTick] = useState(0);

  // Interactive Buddy selector
  const [activeBuddyIdx, setActiveBuddyIdx] = useState(0);
  const activeBuddy = ALL_BUDDIES[activeBuddyIdx];
  const activePalette = AVATAR_COLORS[activeBuddy.color];

  // Solo vs Group interactive preview
  const [previewMode, setPreviewMode] = useState<'solo' | 'group'>('group');

  const demoSpent = DEMO_ITEMS.reduce(
    (sum, item) => sum + item.amount * (demoCounts[item.label] || 0),
    0
  );
  const demoRemaining = demoCap - demoSpent;
  const demoRatio = Math.max(0, Math.min(1, demoRemaining / demoCap));

  const ringSize = 188;
  const strokeWidth = 15;
  const ringRadius = (ringSize - strokeWidth) / 2;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc * (1 - demoRatio);

  // Build live category slices for the demo donut chart
  const demoSlices: CategorySlice[] = DEMO_ITEMS.map((item) => {
    const count = demoCounts[item.label] || 0;
    const totalCents = item.amount * count * 100;
    return {
      category: item.category,
      totalCents,
      percentage:
        demoSpent > 0 ? Math.round(((item.amount * count) / demoSpent) * 100) : 0,
      count,
    };
  })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.totalCents - a.totalCents);

  const handleAddDemoItem = (label: string) => {
    setDemoCounts((prev) => ({
      ...prev,
      [label]: (prev[label] || 0) + 1,
    }));
    setDemoBurstTick((t) => t + 1);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#F7F8FB] text-[#1A1D26] overflow-x-hidden">
        {/* Strict 3-Zone Top Bar + Scroll Progress Line */}
        <header className="sticky top-0 z-30 bg-[#F7F8FB]/90 backdrop-blur-md border-b border-[#E7EAF2]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
            <a
              href="#top"
              className="font-display text-xl font-bold tracking-tight text-[#1A1D26] whitespace-nowrap shrink-0"
            >
              PennyPals
            </a>

            <nav
              className="hidden md:flex items-center gap-7 text-sm font-medium text-[#687082]"
              aria-label="Landing sections"
            >
              <a
                href="#why-track"
                className="hover:text-[#1A1D26] transition-colors whitespace-nowrap shrink-0"
              >
                Why Track
              </a>
              <a
                href="#try-ring"
                className="hover:text-[#1A1D26] transition-colors whitespace-nowrap shrink-0"
              >
                Try the Ring
              </a>
              <a
                href="#solo-or-group"
                className="hover:text-[#1A1D26] transition-colors whitespace-nowrap shrink-0"
              >
                Solo or Group
              </a>
            </nav>

            <div className="shrink-0">
              <button
                type="button"
                onClick={onSignIn}
                disabled={signingIn}
                className="h-10 px-4 rounded-xl bg-[#FF5D73] hover:bg-[#EB4960] disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                {signingIn ? 'Signing in...' : 'Start with Google'}
              </button>
            </div>
          </div>

          <motion.div
            className="h-0.5 bg-[#FF5D73] origin-left"
            style={{ scaleX: smoothProgress }}
          />
        </header>

        {/* Hero Section */}
        <section
          id="top"
          ref={heroRef}
          className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-16 sm:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-4">
              <p className="text-xs sm:text-sm font-medium text-[#687082]">
                Daily expense &amp; habit tracker
              </p>
              <h1
                className="font-display font-bold tracking-tight text-[#1A1D26] leading-[1.08] text-balance"
                style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.6rem)' }}
              >
                Small daily spends add up quietly.
              </h1>
              <p className="text-base sm:text-lg text-[#687082] leading-relaxed max-w-lg">
                A ₹60 chai here, a ₹120 ride there—most budgets vanish in tiny invisible taps. PennyPals gives you one calm daily ring, a friendly streak, and clear visuals so every rupee feels intentional.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onSignIn}
                disabled={signingIn}
                className="h-12 px-6 rounded-2xl bg-[#FF5D73] hover:bg-[#EB4960] disabled:opacity-60 text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
              >
                <span>{signingIn ? 'Signing in...' : 'Continue with Google'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#try-ring"
                className="h-12 px-5 rounded-2xl bg-white border border-[#E7EAF2] hover:bg-[#F2F4F9] text-sm font-semibold text-[#1A1D26] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Play with demo</span>
                <ArrowDown className="w-4 h-4 text-[#687082]" />
              </a>
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-[#BE123C]" role="alert">
                {errorMsg}
              </p>
            )}

            <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#687082]">
              <span>Track solo or with friends</span>
              <span aria-hidden="true">·</span>
              <span>Rupees (₹) &amp; global currencies</span>
              <span aria-hidden="true">·</span>
              <span>Instant visual breakdowns</span>
            </div>
          </div>

          <motion.div className="lg:col-span-6" style={{ y: heroVisualY }}>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="bg-white border border-[#E7EAF2] rounded-3xl p-4 sm:p-6 overflow-hidden space-y-4"
            >
              {!imgFailed ? (
                <img
                  src="/src/assets/images/pennypals_mascot_welcome_1794725324226.jpg"
                  alt="PennyPals coin-bank buddy surrounded by pastel shapes and a golden star"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full aspect-4/3 object-cover rounded-2xl bg-[#F7F8FB]"
                />
              ) : (
                <div className="w-full aspect-4/3 rounded-2xl bg-[#FFF4F6] flex flex-col items-center justify-center gap-3 p-6">
                  <BuddyAvatar avatarKey="piggy" colorKey="coral" size="xl" mood="happy" />
                  <span className="font-display text-lg font-semibold text-[#1A1D26]">
                    PennyPals
                  </span>
                </div>
              )}

              {/* Interactive Buddy Picker Bar */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#1A1D26] truncate">
                    Meet {activeBuddy.name}
                  </div>
                  <div className="text-xs text-[#687082] truncate">
                    {activeBuddy.tagline}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {ALL_BUDDIES.map((b, idx) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setActiveBuddyIdx(idx)}
                      aria-label={`Select ${b.name} buddy`}
                      className={`rounded-xl p-0.5 transition-all ${
                        idx === activeBuddyIdx
                          ? 'ring-2 ring-[#FF5D73] scale-105'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <BuddyAvatar avatarKey={b.key} colorKey={b.color} size="sm" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Section 01: Interactive Why-Track Bento */}
        <section
          id="why-track"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl space-y-2"
          >
            <p className="text-xs font-semibold text-[#FF5D73]">Why daily tracking works</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#1A1D26] text-balance">
              Awareness happens in the moment, not on a spreadsheet next month.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Card 1 (7 cols): Interactive Small-Spend Leak Calculator */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-7 bg-white border border-[#E7EAF2] rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-[#687082]">
                    01. Tap to toggle everyday spends
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-[#1A1D26]">
                    See how tiny taps add up in 30 days
                  </h3>
                </div>

                <div className="text-right tabular-nums">
                  <div className="text-xs text-[#687082]">Monthly impact</div>
                  <div className="font-display text-2xl font-bold text-[#FF5D73]">
                    ₹{monthlyLeakTotal.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-[#687082]">
                    ₹{dailyLeakTotal.toLocaleString('en-IN')}/day
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {LEAK_ITEMS.map((item) => {
                  const active = Boolean(selectedLeaks[item.id]);
                  const meta = CATEGORY_MAP[item.category];
                  const barPct =
                    dailyLeakTotal > 0 && active
                      ? Math.max(8, Math.round((item.amount / dailyLeakTotal) * 100))
                      : 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setSelectedLeaks((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className={`w-full text-left rounded-2xl p-3 border transition-all flex items-center gap-3 ${
                        active
                          ? 'bg-[#F7F8FB] border-[#DCE1EC]'
                          : 'bg-white border-[#F1F3F8] opacity-60 hover:opacity-90'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          active
                            ? 'bg-[#1A1D26] text-white'
                            : 'border border-[#CBD5E1] bg-white'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <CategoryIcon category={item.category} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-[#1A1D26] truncate">
                            {item.label}
                          </span>
                          <span className="font-bold text-[#1A1D26] tabular-nums">
                            ₹{item.amount}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white overflow-hidden">
                          <motion.div
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            style={{ backgroundColor: meta.barHex }}
                            className="h-full rounded-full"
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.article>

            {/* Card 2 (5 cols): Interactive 7-Day Streak Builder */}
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-5 bg-white border border-[#E7EAF2] rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#687082]">
                  02. Tap stars to test a streak
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#1A1D26]">
                  Streaks that reward showing up
                </h3>
                <p className="text-sm text-[#687082] leading-relaxed">
                  Checking in takes two seconds. Tap the days below to see how consecutive logs keep your flame bright.
                </p>
              </div>

              <div className="rounded-2xl bg-[#F7F8FB] p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      key={computedStreak}
                      initial={{ scale: 0.85 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        computedStreak >= 7
                          ? 'bg-[#FEF3D6] text-[#D97706]'
                          : computedStreak > 0
                            ? 'bg-[#FFF0F2] text-[#FF5D73]'
                            : 'bg-[#E7EAF2] text-[#8E96A8]'
                      }`}
                    >
                      <Flame className="w-5 h-5 fill-current" />
                    </motion.div>
                    <div>
                      <div className="font-display text-lg font-bold text-[#1A1D26] tabular-nums">
                        {computedStreak} {computedStreak === 1 ? 'day' : 'days'} streak
                      </div>
                      <div className="text-xs text-[#687082]">
                        {computedStreak === 7
                          ? 'Full week complete!'
                          : 'Tap Saturday & Sunday to finish the week'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {WEEK_DAYS.map((day, idx) => {
                    const active = streakChecks[idx];
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setStreakChecks((prev) =>
                            prev.map((val, i) => (i === idx ? !val : val))
                          )
                        }
                        aria-label={`Toggle ${day} streak`}
                        className="py-2 rounded-xl hover:bg-white transition-colors flex flex-col items-center gap-1"
                      >
                        <span className="text-[10px] font-medium text-[#687082]">
                          {day.slice(0, 1)}
                        </span>
                        <motion.span
                          animate={{ scale: active ? 1 : 0.9 }}
                          whileTap={{ scale: 0.82 }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                            active
                              ? 'bg-[#FEF3D6] text-[#D97706]'
                              : 'bg-white border border-[#DCE1EC] text-[#C5CCD9]'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${active ? 'fill-current' : ''}`} />
                        </motion.span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.article>
          </div>
        </section>

        {/* Section 02: Interactive Live Ring + Visual Breakdown Playground */}
        <section
          id="try-ring"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-[#E7EAF2] rounded-3xl p-6 sm:p-10 space-y-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="text-xs font-semibold text-[#FF5D73]">
                  Interactive playground
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1D26] text-balance">
                  Tap an expense to watch your ring &amp; graph update live.
                </h2>
                <p className="text-sm text-[#687082] leading-relaxed">
                  Adjust your daily cap, log a few items, and inspect where the day’s spending went.
                </p>
              </div>

              {/* Interactive Daily Cap Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-[#687082] mr-1">Daily cap:</span>
                {[300, 500, 800, 1200].map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setDemoCap(cap)}
                    className={`h-9 px-3 rounded-xl text-xs font-semibold tabular-nums transition-colors ${
                      demoCap === cap
                        ? 'bg-[#1A1D26] text-white'
                        : 'bg-[#F7F8FB] text-[#687082] hover:text-[#1A1D26]'
                    }`}
                  >
                    ₹{cap}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Tap Expense Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {DEMO_ITEMS.map((item) => {
                const count = demoCounts[item.label] || 0;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleAddDemoItem(item.label)}
                    className="h-12 px-4 rounded-2xl bg-[#F7F8FB] hover:bg-[#FFF0F2] border border-[#E7EAF2] hover:border-[#FF5D73] text-sm font-semibold text-[#1A1D26] flex items-center gap-2 active:scale-[0.97] transition-all whitespace-nowrap"
                  >
                    <CategoryIcon category={item.category} size="sm" />
                    <span>+₹{item.amount}</span>
                    <span className="text-xs font-medium text-[#687082]">
                      {item.label}
                    </span>
                    {count > 0 && (
                      <span className="text-xs font-bold text-[#FF5D73] tabular-nums">
                        ×{count}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  setDemoCounts({
                    'Chai & snack': 0,
                    'Lunch bowl': 0,
                    'Auto ride': 0,
                    'Fruit & milk': 0,
                  })
                }
                className="h-12 px-4 rounded-2xl bg-white border border-[#E7EAF2] hover:bg-[#F7F8FB] text-xs font-semibold text-[#687082] flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear day</span>
              </button>
            </div>

            {/* Dual Visual: Shrinking Budget Ring + Live Donut Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2 border-t border-[#F1F3F8]">
              <div className="lg:col-span-5 flex flex-col items-center justify-center relative py-2">
                <AnimatePresence>
                  {demoBurstTick > 0 && (
                    <motion.div
                      key={demoBurstTick}
                      initial={{ opacity: 1, scale: 0.7 }}
                      animate={{ opacity: 0, scale: 1.35 }}
                      transition={{ duration: 0.5 }}
                      className="pointer-events-none absolute w-48 h-48 rounded-full border-2 border-[#FF5D73]/40"
                    />
                  )}
                </AnimatePresence>

                <motion.div
                  animate={demoBurstTick > 0 ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="relative flex items-center justify-center"
                  style={{ width: ringSize, height: ringSize }}
                >
                  <svg
                    width={ringSize}
                    height={ringSize}
                    viewBox={`0 0 ${ringSize} ${ringSize}`}
                    className="-rotate-90"
                    role="img"
                    aria-label={`Demo budget ring: ₹${Math.abs(demoRemaining)}`}
                  >
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke={demoRemaining < 0 ? '#FFE4E8' : '#EEF1F7'}
                      strokeWidth={strokeWidth}
                    />
                    <motion.circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={ringRadius}
                      fill="none"
                      stroke={
                        demoRemaining < 0
                          ? '#E11D48'
                          : demoRatio <= 0.25
                            ? '#F59E0B'
                            : '#FF5D73'
                      }
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={ringCirc}
                      animate={{ strokeDashoffset: ringOffset }}
                      transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                      style={{
                        backgroundColor: activePalette.bg,
                        color: activePalette.ink,
                      }}
                    >
                      <BuddyIllustration
                        avatarKey={activeBuddy.key}
                        mood={
                          demoRemaining < 0
                            ? 'surprised'
                            : demoSpent === 0
                              ? 'curious'
                              : demoRatio <= 0.25
                                ? 'focused'
                                : 'happy'
                        }
                        className="w-6 h-6"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[#687082]">
                      {demoRemaining < 0 ? 'Over by' : 'Left today'}
                    </span>
                    <span
                      className={`font-display text-3xl font-bold tabular-nums ${
                        demoRemaining < 0 ? 'text-[#BE123C]' : 'text-[#1A1D26]'
                      }`}
                    >
                      ₹{Math.abs(demoRemaining).toLocaleString('en-IN')}
                    </span>
                  </div>
                </motion.div>

                <p className="mt-2 text-xs text-[#687082] tabular-nums">
                  Spent ₹{demoSpent.toLocaleString('en-IN')} of ₹{demoCap.toLocaleString('en-IN')} daily cap
                </p>
              </div>

              <div className="lg:col-span-7">
                {demoSlices.length === 0 ? (
                  <div className="rounded-2xl bg-[#F7F8FB] p-8 text-center space-y-2">
                    <Sparkles className="w-5 h-5 text-[#FF5D73] mx-auto" />
                    <p className="text-sm font-semibold text-[#1A1D26]">
                      Zero spend so far
                    </p>
                    <p className="text-xs text-[#687082]">
                      Tap any of the expense buttons above to populate your live visual graph.
                    </p>
                  </div>
                ) : (
                  <CategoryDonutChart
                    slices={demoSlices}
                    totalCents={demoSpent * 100}
                    currency="INR"
                    centerLabel="Demo spend"
                    size={170}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Section 03: Solo or Group Mode Switch */}
        <section
          id="solo-or-group"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
          >
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs font-semibold text-[#687082]">
                03. Your pace, your people
              </div>
              <h2 className="font-display text-3xl font-bold text-[#1A1D26] text-balance">
                Keep it private, or bring your pals along.
              </h2>
              <p className="text-sm text-[#687082] leading-relaxed">
                Start in Individual Mode to track privately in Rupees, or invite roommates, family, or close friends into a shared board where everyone cheers each other’s streaks.
              </p>

              <div className="inline-flex items-center gap-1 p-1 bg-[#ECEFF6] rounded-2xl">
                <button
                  type="button"
                  onClick={() => setPreviewMode('solo')}
                  className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    previewMode === 'solo'
                      ? 'bg-white text-[#1A1D26] shadow-xs'
                      : 'text-[#687082] hover:text-[#1A1D26]'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Individual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('group')}
                  className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    previewMode === 'group'
                      ? 'bg-white text-[#1A1D26] shadow-xs'
                      : 'text-[#687082] hover:text-[#1A1D26]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Group</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              {previewMode === 'solo' ? (
                <motion.div
                  key="solo-preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-[#E7EAF2] rounded-3xl p-6 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <BuddyAvatar avatarKey="sprout" colorKey="mint" size="lg" mood="happy" />
                    <div>
                      <div className="font-display text-lg font-bold text-[#1A1D26]">
                        Just You · Private Log
                      </div>
                      <div className="text-xs text-[#687082]">
                        ₹500 daily budget · 5-day personal streak
                      </div>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="font-display text-2xl font-bold text-[#1A1D26]">
                      ₹340
                    </div>
                    <div className="text-xs text-[#687082]">left today</div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="group-preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  {[
                    { name: 'You', avatar: 'piggy' as const, color: 'coral' as const, left: '₹340', streak: 5 },
                    { name: 'Riya', avatar: 'bunny' as const, color: 'lavender' as const, left: '₹420', streak: 9 },
                    { name: 'Kabir', avatar: 'bear' as const, color: 'sky' as const, left: '₹280', streak: 4 },
                  ].map((pal) => (
                    <div
                      key={pal.name}
                      className="bg-white border border-[#E7EAF2] rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <BuddyAvatar avatarKey={pal.avatar} colorKey={pal.color} size="sm" />
                        <div className="min-w-0">
                          <div className="font-display text-sm font-bold text-[#1A1D26] truncate">
                            {pal.name}
                          </div>
                          <div className="text-[11px] text-[#687082] tabular-nums">
                            {pal.streak}-day streak
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[#F1F3F8] flex items-baseline justify-between">
                        <span className="text-[11px] text-[#687082]">Left</span>
                        <span className="font-display text-base font-bold text-[#1A1D26] tabular-nums">
                          {pal.left}
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </section>

        {/* Bottom CTA with Clickable Interactive Buddies */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-16 text-center space-y-6">
          <div className="flex items-center justify-center gap-2.5 sm:gap-3">
            {ALL_BUDDIES.map((b, idx) => {
              const selected = idx === activeBuddyIdx;
              return (
                <motion.button
                  key={b.key}
                  type="button"
                  onClick={() => setActiveBuddyIdx(idx)}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={`Choose ${b.name}`}
                  className={`rounded-2xl p-0.5 transition-all ${
                    selected ? 'ring-2 ring-[#FF5D73]' : ''
                  }`}
                >
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 2.6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: idx * 0.25,
                    }}
                  >
                    <BuddyAvatar avatarKey={b.key} colorKey={b.color} size="md" mood="happy" />
                  </motion.div>
                </motion.button>
              );
            })}
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#1A1D26] text-balance">
              Ready to track with {activeBuddy.name}?
            </h2>
            <p className="text-sm sm:text-base text-[#687082]">
              {activeBuddy.tagline} · Takes 15 seconds to set your Rupee budget.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={onSignIn}
              disabled={signingIn}
              className="h-12 px-7 rounded-2xl bg-[#FF5D73] hover:bg-[#EB4960] disabled:opacity-60 text-white font-semibold text-base flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] transition-all"
            >
              <span>{signingIn ? 'Signing in...' : 'Continue with Google'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <footer className="border-t border-[#E7EAF2] py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8E96A8]">
            <span>PennyPals · Calm daily expense &amp; habit tracking</span>
            <span>Individual &amp; shared group budgets</span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
