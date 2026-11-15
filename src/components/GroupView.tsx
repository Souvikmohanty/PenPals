import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  Flame,
  Pencil,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import {
  AVATAR_COLORS,
  CATEGORY_MAP,
  type CurrencyCode,
  type Expense,
  type Group,
  type GroupMember,
} from '../types';
import { computeStreak, formatCents, formatFriendlyDate, getLastNDaysKeys } from '../utils/finance';
import { BuddyAvatar, CategoryIcon } from './BuddyAvatar';

interface GroupViewProps {
  currentUserId: string;
  currency: CurrencyCode;
  group: Group | null;
  members: GroupMember[];
  expenses: Expense[];
  todayKey: string;
  onEditExpense: (expense: Expense) => void;
  onCreateGroup: (groupName: string) => Promise<void>;
  onJoinGroup: (inviteCode: string) => Promise<void>;
}

export function GroupView({
  currentUserId,
  currency,
  group,
  members,
  expenses,
  todayKey,
  onEditExpense,
  onCreateGroup,
  onJoinGroup,
}: GroupViewProps) {
  const [copied, setCopied] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'today' | 'week'>('today');

  // Solo -> Group conversion state
  const [setupMode, setSetupMode] = useState<'create' | 'join'>('create');
  const [newGroupName, setNewGroupName] = useState('Family & Friends');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  if (!group) {
    const handleGroupAction = async (e: React.FormEvent) => {
      e.preventDefault();
      setSetupError(null);
      setSubmitting(true);
      try {
        if (setupMode === 'create') {
          if (!newGroupName.trim()) {
            setSetupError('Please enter a group name.');
            setSubmitting(false);
            return;
          }
          await onCreateGroup(newGroupName.trim());
        } else {
          if (inviteCodeInput.trim().length < 6) {
            setSetupError('Please enter a valid 6–8 character invite code.');
            setSubmitting(false);
            return;
          }
          await onJoinGroup(inviteCodeInput.trim());
        }
      } catch (err) {
        setSetupError(err instanceof Error ? err.message : 'Could not update group.');
        setSubmitting(false);
      }
    };

    return (
      <div className="max-w-xl mx-auto bg-white border border-[#E7EAF2] rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#1A1D26]">
            Currently in Individual Mode
          </h1>
          <p className="text-sm text-[#687082]">
            Your budget and expenses are private to you. Whenever you’d like friendly accountability, create a group or join one with an invite code.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-[#F2F4F9] rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setSetupMode('create');
              setSetupError(null);
            }}
            className={`h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              setupMode === 'create'
                ? 'bg-white text-[#1A1D26] shadow-xs'
                : 'text-[#687082] hover:text-[#1A1D26]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Create Group</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSetupMode('join');
              setSetupError(null);
            }}
            className={`h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              setupMode === 'join'
                ? 'bg-white text-[#1A1D26] shadow-xs'
                : 'text-[#687082] hover:text-[#1A1D26]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Join with Code</span>
          </button>
        </div>

        <form onSubmit={handleGroupAction} className="space-y-4">
          {setupMode === 'create' ? (
            <div>
              <label
                htmlFor="solo-create-group-name"
                className="block text-sm font-medium text-[#1A1D26] mb-1.5"
              >
                Group name
              </label>
              <input
                id="solo-create-group-name"
                type="text"
                maxLength={50}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Home Crew, Roommates"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm text-[#1A1D26] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="solo-join-code"
                className="block text-sm font-medium text-[#1A1D26] mb-1.5"
              >
                Invite code
              </label>
              <input
                id="solo-join-code"
                type="text"
                maxLength={12}
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. ABCD1234"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm font-mono uppercase tracking-wider text-[#1A1D26] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              />
            </div>
          )}

          {setupError && (
            <p className="text-xs font-medium text-[#BE123C]" role="alert">
              {setupError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-[#FF5D73] hover:bg-[#EB4960] disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <span>
              {submitting
                ? 'Connecting...'
                : setupMode === 'create'
                  ? 'Create Group'
                  : 'Join Group'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback not needed
    }
  };

  const sortedMembers = [...members].sort((a, b) => {
    if (a.uid === currentUserId) return -1;
    if (b.uid === currentUserId) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const last7Set = new Set(getLastNDaysKeys(todayKey, 7));
  const filteredFeed = expenses.filter((exp) =>
    feedFilter === 'today' ? exp.dateKey === todayKey : last7Set.has(exp.dateKey)
  );

  const groupSpentTodayCents = expenses
    .filter((e) => e.dateKey === todayKey)
    .reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <div className="space-y-6">
      {/* Group Banner Header */}
      <section className="bg-white border border-[#E7EAF2] rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-[#687082]">
            <Users className="w-3.5 h-3.5" />
            <span>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {formatCents(groupSpentTodayCents, currency)} spent today
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[#1A1D26]">{group.name}</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-2xl bg-[#F7F8FB] border border-[#E7EAF2] flex items-center gap-3">
            <div>
              <div className="text-[11px] font-medium text-[#687082]">Invite code</div>
              <div className="font-mono text-sm font-semibold tracking-wider text-[#1A1D26]">
                {group.inviteCode}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="min-h-[40px] px-3 rounded-xl bg-white border border-[#E7EAF2] hover:bg-[#F2F4F9] text-xs font-semibold text-[#1A1D26] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#687082]" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Member Accountability Side-by-Side Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[#1A1D26]">
            Today’s progress
          </h2>
          <span className="text-xs text-[#687082]">Updated live</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedMembers.map((member) => {
            const memberTodayExpenses = expenses.filter(
              (e) => e.authorId === member.uid && e.dateKey === todayKey
            );
            const spentToday = memberTodayExpenses.reduce((s, e) => s + e.amountCents, 0);
            const remaining = member.dailyBudgetCents - spentToday;
            const isOver = remaining < 0;
            const ratio = Math.max(
              0,
              Math.min(1, member.dailyBudgetCents > 0 ? remaining / member.dailyBudgetCents : 0)
            );
            const streak = computeStreak(expenses, member.uid, todayKey);
            const palette = AVATAR_COLORS[member.avatarColor] || AVATAR_COLORS.coral;
            const isMe = member.uid === currentUserId;

            const ringSize = 56;
            const stroke = 5;
            const r = (ringSize - stroke) / 2;
            const circ = 2 * Math.PI * r;
            const offset = circ * (1 - ratio);

            return (
              <article
                key={member.uid}
                className="bg-white border border-[#E7EAF2] rounded-3xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <BuddyAvatar
                      avatarKey={member.avatarKey}
                      colorKey={member.avatarColor}
                      size="md"
                      mood={isOver ? 'surprised' : streak.loggedToday ? 'happy' : 'curious'}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display text-base font-bold text-[#1A1D26] truncate">
                          {member.displayName}
                        </h3>
                        {isMe && (
                          <span className="text-xs font-medium text-[#687082]">(You)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#687082] mt-0.5">
                        {streak.status === 'active' ? (
                          <Flame className="w-3.5 h-3.5 text-[#D97706] fill-current shrink-0" />
                        ) : (
                          <Star className="w-3.5 h-3.5 text-[#9AA3B5] shrink-0" />
                        )}
                        <span className="tabular-nums">
                          {streak.streakDays} {streak.streakDays === 1 ? 'day' : 'days'} streak
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
                    <svg width={ringSize} height={ringSize} className="-rotate-90">
                      <circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={r}
                        fill="none"
                        stroke="#EEF1F7"
                        strokeWidth={stroke}
                      />
                      <circle
                        cx={ringSize / 2}
                        cy={ringSize / 2}
                        r={r}
                        fill="none"
                        stroke={isOver ? '#E11D48' : palette.ring}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#1A1D26] tabular-nums">
                      {Math.round(ratio * 100)}%
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F3F8] flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-xs text-[#687082]">
                      {isOver ? 'Over budget' : 'Remaining today'}
                    </div>
                    <div
                      className={`font-display text-xl font-bold tabular-nums flex items-center gap-1 ${
                        isOver ? 'text-[#BE123C]' : 'text-[#1A1D26]'
                      }`}
                    >
                      {isOver && <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span>
                        {isOver
                          ? formatCents(Math.abs(remaining), currency)
                          : formatCents(remaining, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-[#687082]">Spent / Cap</div>
                    <div className="text-xs font-semibold text-[#1A1D26] tabular-nums mt-0.5">
                      {formatCents(spentToday, currency)} /{' '}
                      {formatCents(member.dailyBudgetCents, currency, false)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {memberTodayExpenses.length === 0 ? (
                    <p className="text-xs text-[#8E96A8]">No expenses logged today yet</p>
                  ) : (
                    memberTodayExpenses.slice(0, 3).map((exp) => {
                      const cat = CATEGORY_MAP[exp.category] || CATEGORY_MAP.other;
                      return (
                        <div
                          key={exp.id}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <span className="text-[#475569] truncate pr-2">
                            {exp.note || cat.label}
                          </span>
                          <span className="font-semibold text-[#1A1D26] tabular-nums shrink-0">
                            {formatCents(exp.amountCents, currency)}
                          </span>
                        </div>
                      );
                    })
                  )}
                  {memberTodayExpenses.length > 3 && (
                    <p className="text-[11px] text-[#687082]">
                      +{memberTodayExpenses.length - 3} more today
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Shared Activity Feed */}
      <section className="bg-white border border-[#E7EAF2] rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F3F8] flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-[#1A1D26]">
            Shared activity
          </h2>

          <div className="flex items-center gap-1 p-1 bg-[#F2F4F9] rounded-xl">
            <button
              type="button"
              onClick={() => setFeedFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                feedFilter === 'today'
                  ? 'bg-white text-[#1A1D26] shadow-xs'
                  : 'text-[#687082] hover:text-[#1A1D26]'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setFeedFilter('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                feedFilter === 'week'
                  ? 'bg-white text-[#1A1D26] shadow-xs'
                  : 'text-[#687082] hover:text-[#1A1D26]'
              }`}
            >
              Last 7 Days
            </button>
          </div>
        </div>

        {filteredFeed.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#687082]">
            No expenses logged by anyone in this timeframe yet.
          </div>
        ) : (
          <ul className="divide-y divide-[#F1F3F8]">
            {filteredFeed.map((exp) => {
              const cat = CATEGORY_MAP[exp.category] || CATEGORY_MAP.other;
              const isMine = exp.authorId === currentUserId;

              const rowContent = (
                <>
                  <CategoryIcon category={exp.category} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1A1D26] truncate">
                      {exp.note || cat.label}
                    </div>
                    <div className="text-xs text-[#687082] flex items-center gap-1.5 truncate">
                      <span>{isMine ? 'You' : exp.authorName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{cat.shortLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatFriendlyDate(exp.dateKey, todayKey)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-display text-base font-bold text-[#1A1D26] tabular-nums">
                      {formatCents(exp.amountCents, currency)}
                    </span>
                    {isMine && <Pencil className="w-3.5 h-3.5 text-[#8E96A8]" />}
                  </div>
                </>
              );

              return (
                <li key={exp.id}>
                  {isMine ? (
                    <button
                      type="button"
                      onClick={() => onEditExpense(exp)}
                      className="w-full min-h-[62px] px-5 py-3 flex items-center gap-3.5 text-left hover:bg-[#F9FAFC] transition-colors"
                    >
                      {rowContent}
                    </button>
                  ) : (
                    <div className="w-full min-h-[62px] px-5 py-3 flex items-center gap-3.5">
                      {rowContent}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
