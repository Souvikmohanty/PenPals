import { ArrowRight, LogOut, Sparkles, User as UserIcon, Users } from 'lucide-react';
import { useState } from 'react';
import {
  AVATAR_COLORS,
  AVATAR_KEYS,
  CURRENCIES,
  CURRENCY_MAP,
  type AvatarColorKey,
  type AvatarKey,
  type CurrencyCode,
  type UserProfile,
} from '../types';
import { BuddyAvatar } from './BuddyAvatar';

interface WelcomeSignInProps {
  onSignIn: () => Promise<void>;
  signingIn: boolean;
  errorMsg: string | null;
}

export function WelcomeSignIn({ onSignIn, signingIn, errorMsg }: WelcomeSignInProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col justify-between px-4 py-8 md:py-12">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <span className="font-display text-xl font-bold tracking-tight text-[#1A1D26]">
          PennyPals
        </span>
      </header>

      <main className="max-w-5xl w-full mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#1A1D26] leading-[1.1] text-balance">
              Daily budgets, solo or with friends.
            </h1>
            <p className="text-base sm:text-lg text-[#687082] leading-relaxed max-w-md">
              Log expenses in two taps, watch your daily ring shrink, and build a calm daily streak—on your own or alongside family and friends.
            </p>
          </div>

          <div className="space-y-3 max-w-sm">
            <button
              type="button"
              onClick={onSignIn}
              disabled={signingIn}
              className="w-full h-13 px-6 rounded-2xl bg-[#FF5D73] hover:bg-[#EB4960] disabled:opacity-60 text-white font-semibold text-base flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] transition-all"
            >
              <span>{signingIn ? 'Signing in...' : 'Continue with Google'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {errorMsg && (
              <p className="text-xs font-medium text-[#BE123C]" role="alert">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#687082]">
            <span>Individual or group mode</span>
            <span aria-hidden="true">·</span>
            <span>Rupees &amp; global currencies</span>
            <span aria-hidden="true">·</span>
            <span>Daily logging streaks</span>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-white border border-[#E7EAF2] rounded-3xl p-4 sm:p-6 overflow-hidden">
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
          </div>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto text-xs text-[#8E96A8]">
        PennyPals · Built for calm daily habits
      </footer>
    </div>
  );
}

interface SetupOnboardingProps {
  user: UserProfile;
  onStartIndividual: (params: {
    dailyBudgetCents: number;
    currency: CurrencyCode;
    displayName: string;
    avatarKey: AvatarKey;
    avatarColor: AvatarColorKey;
  }) => Promise<void>;
  onCreateGroup: (params: {
    groupName: string;
    dailyBudgetCents: number;
    currency: CurrencyCode;
    displayName: string;
    avatarKey: AvatarKey;
    avatarColor: AvatarColorKey;
  }) => Promise<void>;
  onJoinGroup: (params: {
    inviteCode: string;
    dailyBudgetCents: number;
    currency: CurrencyCode;
    displayName: string;
    avatarKey: AvatarKey;
    avatarColor: AvatarColorKey;
  }) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function GroupOnboarding({
  user,
  onStartIndividual,
  onCreateGroup,
  onJoinGroup,
  onSignOut,
}: SetupOnboardingProps) {
  const [mode, setMode] = useState<'individual' | 'create' | 'join'>('individual');
  const [currency, setCurrency] = useState<CurrencyCode>(user.currency || 'INR');
  const currencyMeta = CURRENCY_MAP[currency] || CURRENCY_MAP.INR;

  const [groupName, setGroupName] = useState('Home & Friends');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState(user.displayName);
  const [budgetMajor, setBudgetMajor] = useState(() =>
    String(
      user.dailyBudgetCents
        ? Math.round(user.dailyBudgetCents / 100)
        : currencyMeta.defaultDailyBudgetMajor
    )
  );
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(user.avatarKey || 'piggy');
  const [avatarColor, setAvatarColor] = useState<AvatarColorKey>(user.avatarColor || 'coral');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCurrencyChange = (nextCurrency: CurrencyCode) => {
    setCurrency(nextCurrency);
    const nextMeta = CURRENCY_MAP[nextCurrency] || CURRENCY_MAP.INR;
    setBudgetMajor(String(nextMeta.defaultDailyBudgetMajor));
  };

  const parsedBudget = Number.parseFloat(budgetMajor);
  const dailyBudgetCents = Number.isFinite(parsedBudget)
    ? Math.round(parsedBudget * 100)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dailyBudgetCents < 100) {
      setErrorMsg(`Please set a daily budget of at least ${currencyMeta.symbol}1.`);
      return;
    }
    if (!displayName.trim()) {
      setErrorMsg('Please enter your display name.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (mode === 'individual') {
        await onStartIndividual({
          dailyBudgetCents,
          currency,
          displayName: displayName.trim(),
          avatarKey,
          avatarColor,
        });
      } else if (mode === 'create') {
        if (!groupName.trim()) {
          setErrorMsg('Please name your group.');
          setSubmitting(false);
          return;
        }
        await onCreateGroup({
          groupName: groupName.trim(),
          dailyBudgetCents,
          currency,
          displayName: displayName.trim(),
          avatarKey,
          avatarColor,
        });
      } else {
        if (inviteCode.trim().length < 6) {
          setErrorMsg('Enter the 6–8 character invite code from your friend.');
          setSubmitting(false);
          return;
        }
        await onJoinGroup({
          inviteCode: inviteCode.trim(),
          dailyBudgetCents,
          currency,
          displayName: displayName.trim(),
          avatarKey,
          avatarColor,
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FB] px-4 py-6 sm:py-10 flex flex-col">
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between pb-6">
        <span className="font-display text-xl font-bold tracking-tight text-[#1A1D26]">
          PennyPals
        </span>
        <button
          type="button"
          onClick={onSignOut}
          className="min-h-[44px] px-3 rounded-xl text-sm font-medium text-[#687082] hover:text-[#1A1D26] hover:bg-white flex items-center gap-1.5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </header>

      <main className="max-w-2xl w-full mx-auto my-auto bg-white border border-[#E7EAF2] rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <BuddyAvatar avatarKey={avatarKey} colorKey={avatarColor} size="lg" mood="happy" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#1A1D26]">
              Set up your PennyPal
            </h1>
            <p className="text-sm text-[#687082]">
              Track privately on your own or share progress with a group—you can switch anytime.
            </p>
          </div>
        </div>

        {/* 3-option Mode Segmented Control */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#F2F4F9] rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMode('individual');
              setErrorMsg(null);
            }}
            className={`h-11 px-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              mode === 'individual'
                ? 'bg-white text-[#1A1D26] shadow-xs'
                : 'text-[#687082] hover:text-[#1A1D26]'
            }`}
          >
            <UserIcon className="w-4 h-4 shrink-0" />
            <span>Individual</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setErrorMsg(null);
            }}
            className={`h-11 px-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              mode === 'create'
                ? 'bg-white text-[#1A1D26] shadow-xs'
                : 'text-[#687082] hover:text-[#1A1D26]'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>New Group</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('join');
              setErrorMsg(null);
            }}
            className={`h-11 px-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              mode === 'join'
                ? 'bg-white text-[#1A1D26] shadow-xs'
                : 'text-[#687082] hover:text-[#1A1D26]'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Join Group</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'create' && (
            <div>
              <label
                htmlFor="group-name"
                className="block text-sm font-medium text-[#1A1D26] mb-1.5"
              >
                Group name
              </label>
              <input
                id="group-name"
                type="text"
                maxLength={50}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Flatmates, Family, Chai Club"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm text-[#1A1D26] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              />
            </div>
          )}

          {mode === 'join' && (
            <div>
              <label
                htmlFor="invite-code"
                className="block text-sm font-medium text-[#1A1D26] mb-1.5"
              >
                Invite code
              </label>
              <input
                id="invite-code"
                type="text"
                maxLength={12}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABCD1234"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm font-mono uppercase tracking-wider text-[#1A1D26] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="display-name"
                className="block text-sm font-medium text-[#1A1D26] mb-1.5"
              >
                Your name
              </label>
              <input
                id="display-name"
                type="text"
                maxLength={60}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your first name"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm text-[#1A1D26] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="currency-select"
                className="block text-sm font-medium text-[#1A1D26] mb-1.5"
              >
                Currency
              </label>
              <select
                id="currency-select"
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm font-medium text-[#1A1D26] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol.trim()} · {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="daily-budget"
              className="block text-sm font-medium text-[#1A1D26] mb-1.5"
            >
              Personal daily budget ({currencyMeta.symbol.trim()})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#687082]">
                {currencyMeta.symbol}
              </span>
              <input
                id="daily-budget"
                type="number"
                min={1}
                max={1000000}
                step="1"
                value={budgetMajor}
                onChange={(e) => setBudgetMajor(e.target.value)}
                className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm font-semibold tabular-nums text-[#1A1D26] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {currencyMeta.budgetPresetsMajor.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBudgetMajor(String(amt))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium tabular-nums transition-colors ${
                    Number(budgetMajor) === amt
                      ? 'bg-[#1A1D26] text-white'
                      : 'bg-[#F2F4F9] text-[#687082] hover:text-[#1A1D26]'
                  }`}
                >
                  {currencyMeta.symbol}
                  {amt.toLocaleString(currencyMeta.locale)}
                </button>
              ))}
            </div>
          </div>

          {/* Buddy & Color picker */}
          <div className="space-y-3 pt-1">
            <div>
              <div className="text-sm font-medium text-[#1A1D26] mb-2">Pick your buddy</div>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_KEYS.map((key) => {
                  const selected = avatarKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAvatarKey(key)}
                      aria-label={`Select ${key} buddy`}
                      className={`h-13 rounded-2xl border flex items-center justify-center transition-all ${
                        selected
                          ? 'border-[#FF5D73] bg-[#FFF4F6] ring-1 ring-[#FF5D73]'
                          : 'border-[#E7EAF2] bg-white hover:bg-[#F7F8FB]'
                      }`}
                    >
                      <BuddyAvatar avatarKey={key} colorKey={avatarColor} size="sm" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-[#1A1D26] mb-2">Pastel tint</div>
              <div className="flex flex-wrap items-center gap-2">
                {(Object.keys(AVATAR_COLORS) as AvatarColorKey[]).map((key) => {
                  const c = AVATAR_COLORS[key];
                  const selected = avatarColor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAvatarColor(key)}
                      aria-label={`Select ${c.label} tint`}
                      className={`h-10 px-3 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                        selected
                          ? 'border-[#1A1D26] bg-[#F7F8FB] text-[#1A1D26]'
                          : 'border-[#E7EAF2] bg-white text-[#687082] hover:text-[#1A1D26]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.ring }}
                      />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-[#BE123C]" role="alert">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-[#FF5D73] hover:bg-[#EB4960] disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <span>
              {submitting
                ? 'Setting up...'
                : mode === 'individual'
                  ? 'Start Solo Tracker'
                  : mode === 'create'
                    ? 'Create Group & Start'
                    : 'Join Group & Start'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </main>
    </div>
  );
}
