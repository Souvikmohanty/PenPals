import { Check, Copy, LogOut, Save, User as UserIcon, Users } from 'lucide-react';
import { useState } from 'react';
import {
  AVATAR_COLORS,
  AVATAR_KEYS,
  CURRENCIES,
  CURRENCY_MAP,
  type AvatarColorKey,
  type AvatarKey,
  type CurrencyCode,
  type Group,
  type UserProfile,
} from '../types';
import { BuddyAvatar } from './BuddyAvatar';

interface SettingsViewProps {
  user: UserProfile;
  currency: CurrencyCode;
  group: Group | null;
  onSavePersonalSettings: (params: {
    displayName: string;
    dailyBudgetCents: number;
    currency: CurrencyCode;
    avatarKey: AvatarKey;
    avatarColor: AvatarColorKey;
  }) => Promise<void>;
  onUpdateGroupDetails: (newName: string, currency: CurrencyCode) => Promise<void>;
  onSwitchToIndividual: () => Promise<void>;
  onCreateGroup: (groupName: string) => Promise<void>;
  onJoinGroup: (inviteCode: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function SettingsView({
  user,
  currency,
  group,
  onSavePersonalSettings,
  onUpdateGroupDetails,
  onSwitchToIndividual,
  onCreateGroup,
  onJoinGroup,
  onSignOut,
}: SettingsViewProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(currency);
  const currencyMeta = CURRENCY_MAP[selectedCurrency] || CURRENCY_MAP.INR;

  const [budgetMajor, setBudgetMajor] = useState(
    String(Math.round(user.dailyBudgetCents / 100))
  );
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(user.avatarKey);
  const [avatarColor, setAvatarColor] = useState<AvatarColorKey>(user.avatarColor);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);

  const [groupName, setGroupName] = useState(group?.name ?? 'Home & Friends');
  const [savingGroup, setSavingGroup] = useState(false);
  const [groupSavedNotice, setGroupSavedNotice] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Solo -> Group controls inside settings
  const [groupActionMode, setGroupActionMode] = useState<'create' | 'join'>('create');
  const [newGroupName, setNewGroupName] = useState('Home & Friends');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [groupActionBusy, setGroupActionBusy] = useState(false);
  const [groupActionError, setGroupActionError] = useState<string | null>(null);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number.parseFloat(budgetMajor);
    const budgetCents = Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
    if (budgetCents < 100 || budgetCents > 100000000) {
      setPersonalError(
        `Daily budget must be between ${currencyMeta.symbol}1 and ${currencyMeta.symbol}10,00,000.`
      );
      return;
    }
    if (!displayName.trim()) {
      setPersonalError('Display name cannot be empty.');
      return;
    }
    setPersonalError(null);
    setSavingPersonal(true);
    try {
      await onSavePersonalSettings({
        displayName: displayName.trim(),
        dailyBudgetCents: budgetCents,
        currency: selectedCurrency,
        avatarKey,
        avatarColor,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2200);
    } catch (err) {
      setPersonalError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleRenameGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !groupName.trim()) return;
    setSavingGroup(true);
    try {
      await onUpdateGroupDetails(groupName.trim(), selectedCurrency);
      setGroupSavedNotice(true);
      setTimeout(() => setGroupSavedNotice(false), 2200);
    } finally {
      setSavingGroup(false);
    }
  };

  const handleCopyCode = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleSoloToGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupActionError(null);
    setGroupActionBusy(true);
    try {
      if (groupActionMode === 'create') {
        if (!newGroupName.trim()) {
          setGroupActionError('Please enter a group name.');
          setGroupActionBusy(false);
          return;
        }
        await onCreateGroup(newGroupName.trim());
      } else {
        if (inviteCodeInput.trim().length < 6) {
          setGroupActionError('Enter a valid 6–8 character invite code.');
          setGroupActionBusy(false);
          return;
        }
        await onJoinGroup(inviteCodeInput.trim());
      }
    } catch (err) {
      setGroupActionError(err instanceof Error ? err.message : 'Could not connect group.');
      setGroupActionBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#1A1D26]">
          Budget &amp; Profile
        </h1>
        <p className="text-sm text-[#687082]">
          Customize your daily budget, currency, buddy, and individual or group mode.
        </p>
      </div>

      {/* Personal Budget, Currency & Buddy Card */}
      <form
        onSubmit={handleSavePersonal}
        className="bg-white border border-[#E7EAF2] rounded-3xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-center gap-4">
          <BuddyAvatar avatarKey={avatarKey} colorKey={avatarColor} size="lg" mood="happy" />
          <div>
            <h2 className="font-display text-lg font-semibold text-[#1A1D26]">
              Personal profile
            </h2>
            <p className="text-xs text-[#687082]">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="settings-display-name"
              className="block text-sm font-medium text-[#1A1D26] mb-1.5"
            >
              Display name
            </label>
            <input
              id="settings-display-name"
              type="text"
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm text-[#1A1D26] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="settings-currency"
              className="block text-sm font-medium text-[#1A1D26] mb-1.5"
            >
              Currency
            </label>
            <select
              id="settings-currency"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
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
            htmlFor="settings-daily-budget"
            className="block text-sm font-medium text-[#1A1D26] mb-1.5"
          >
            Daily budget ({currencyMeta.symbol.trim()})
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#687082]">
              {currencyMeta.symbol}
            </span>
            <input
              id="settings-daily-budget"
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

        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-[#1A1D26] mb-2">Buddy icon</div>
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

        {personalError && (
          <p className="text-xs font-medium text-[#BE123C]" role="alert">
            {personalError}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-[#0F766E] font-medium">
            {savedNotice ? 'Changes saved!' : ''}
          </span>
          <button
            type="submit"
            disabled={savingPersonal}
            className="h-11 px-5 rounded-xl bg-[#FF5D73] hover:bg-[#EB4960] disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{savingPersonal ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>

      {/* Mode & Group Card */}
      {group ? (
        <section className="bg-white border border-[#E7EAF2] rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-[#1A1D26]">
                Group mode · {group.name}
              </h2>
              <p className="text-xs text-[#687082]">
                All members have equal permissions to share invites and view progress.
              </p>
            </div>
          </div>

          <form onSubmit={handleRenameGroup} className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1">
              <label htmlFor="settings-group-name" className="sr-only">
                Group name
              </label>
              <input
                id="settings-group-name"
                type="text"
                maxLength={50}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm text-[#1A1D26] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={savingGroup || !groupName.trim()}
              className="h-11 px-4 rounded-xl bg-[#1A1D26] hover:bg-[#2E3342] disabled:opacity-50 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              {groupSavedNotice ? 'Renamed!' : savingGroup ? 'Saving...' : 'Rename Group'}
            </button>
          </form>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#F1F3F8]">
            <div>
              <div className="text-xs font-medium text-[#687082]">Invite friends &amp; family</div>
              <div className="font-mono text-base font-bold tracking-wider text-[#1A1D26]">
                {group.inviteCode}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="h-10 px-4 rounded-xl bg-[#F7F8FB] hover:bg-[#ECEFF6] text-xs font-semibold text-[#1A1D26] flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Invite Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#687082]" />
                  <span>Copy Invite Code</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-3 border-t border-[#F1F3F8] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (!confirmLeave) {
                  setConfirmLeave(true);
                } else {
                  void onSwitchToIndividual();
                }
              }}
              className={`h-10 px-4 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                confirmLeave
                  ? 'bg-[#BE123C] text-white hover:bg-[#9F1239]'
                  : 'bg-[#FFF0F2] text-[#BE123C] hover:bg-[#FFE0E5]'
              }`}
            >
              {confirmLeave ? 'Tap again to switch to Individual Mode' : 'Switch to Individual Mode'}
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="h-10 px-4 rounded-xl bg-[#F7F8FB] hover:bg-[#ECEFF6] text-xs font-semibold text-[#1A1D26] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </section>
      ) : (
        <section className="bg-white border border-[#E7EAF2] rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DCF7EC] text-[#0F766E] flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-[#1A1D26]">
                Individual mode
              </h2>
              <p className="text-xs text-[#687082]">
                Your logs are private. Create or join a group anytime below.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F2F4F9] rounded-xl">
            <button
              type="button"
              onClick={() => {
                setGroupActionMode('create');
                setGroupActionError(null);
              }}
              className={`h-10 rounded-lg text-xs font-semibold transition-all ${
                groupActionMode === 'create'
                  ? 'bg-white text-[#1A1D26] shadow-xs'
                  : 'text-[#687082] hover:text-[#1A1D26]'
              }`}
            >
              Create a Group
            </button>
            <button
              type="button"
              onClick={() => {
                setGroupActionMode('join');
                setGroupActionError(null);
              }}
              className={`h-10 rounded-lg text-xs font-semibold transition-all ${
                groupActionMode === 'join'
                  ? 'bg-white text-[#1A1D26] shadow-xs'
                  : 'text-[#687082] hover:text-[#1A1D26]'
              }`}
            >
              Join via Code
            </button>
          </div>

          <form onSubmit={handleSoloToGroupSubmit} className="flex flex-col sm:flex-row gap-2.5">
            {groupActionMode === 'create' ? (
              <input
                type="text"
                maxLength={50}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                className="flex-1 h-11 px-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm text-[#1A1D26] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              />
            ) : (
              <input
                type="text"
                maxLength={12}
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                className="flex-1 h-11 px-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm font-mono uppercase tracking-wider text-[#1A1D26] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              />
            )}
            <button
              type="submit"
              disabled={groupActionBusy}
              className="h-11 px-4 rounded-xl bg-[#1A1D26] hover:bg-[#2E3342] disabled:opacity-50 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              {groupActionBusy
                ? 'Connecting...'
                : groupActionMode === 'create'
                  ? 'Create Group'
                  : 'Join Group'}
            </button>
          </form>

          {groupActionError && (
            <p className="text-xs font-medium text-[#BE123C]" role="alert">
              {groupActionError}
            </p>
          )}

          <div className="pt-3 border-t border-[#F1F3F8] flex justify-end">
            <button
              type="button"
              onClick={onSignOut}
              className="h-10 px-4 rounded-xl bg-[#F7F8FB] hover:bg-[#ECEFF6] text-xs font-semibold text-[#1A1D26] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
