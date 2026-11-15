import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  CircleDollarSign,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useState } from 'react';
import { GroupOnboarding } from './components/AuthOnboarding';
import { ExpenseKeypadModal } from './components/ExpenseKeypadModal';
import { GroupView } from './components/GroupView';
import { InsightsView } from './components/InsightsView';
import { LandingPage } from './components/LandingPage';
import { SettingsView } from './components/SettingsView';
import { TodayView } from './components/TodayView';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import {
  activateIndividualMode,
  addExpense,
  createGroupAndActivate,
  deleteExpense,
  ensureUserProfile,
  joinGroupByInviteCode,
  leaveGroupToIndividual,
  updateExpense,
  updateGroupDetails,
  updatePersonalSettings,
} from './services/pennypalsService';
import type {
  AvatarColorKey,
  AvatarKey,
  CurrencyCode,
  Expense,
  ExpenseCategory,
  Group,
  GroupMember,
  UserProfile,
} from './types';
import { computeStreak, formatCents, toLocalDateKey } from './utils/finance';

type NavTab = 'today' | 'group' | 'insights' | 'settings';

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught app error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F8FB] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E7EAF2] rounded-3xl p-6 text-center space-y-4">
            <h1 className="font-display text-xl font-bold text-[#1A1D26]">
              Something tripped us up
            </h1>
            <p className="text-sm text-[#687082]">
              Please refresh the page to reconnect with PennyPals.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 px-5 rounded-xl bg-[#FF5D73] text-white text-sm font-semibold hover:bg-[#EB4960] transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <PennyPalsApp />
    </AppErrorBoundary>
  );
}

function PennyPalsApp() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [todayKey, setTodayKey] = useState<string>(() => toLocalDateKey(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    toLocalDateKey(new Date())
  );

  const [loggerOpen, setLoggerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [celebrationTick, setCelebrationTick] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const latest = toLocalDateKey(new Date());
      setTodayKey((prev) => {
        if (prev !== latest) {
          setSelectedDateKey((sel) => (sel === prev ? latest : sel));
          return latest;
        }
        return prev;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (!user) {
        setUserProfile(null);
        setGroup(null);
        setMembers([]);
        setExpenses([]);
        return;
      }

      setProfileLoading(true);
      try {
        await ensureUserProfile(user);
      } catch (err) {
        console.error('Failed to ensure user profile:', err);
      } finally {
        setProfileLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Live listener for authenticated user's profile
  useEffect(() => {
    if (!authReady || !authUser) return;
    const path = `users/${authUser.uid}`;
    const unsub = onSnapshot(
      doc(db, 'users', authUser.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<UserProfile>;
          setUserProfile({
            ...(data as UserProfile),
            trackingMode: data.trackingMode ?? (data.activeGroupId ? 'group' : 'unset'),
            currency: data.currency ?? 'INR',
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return () => unsub();
  }, [authReady, authUser]);

  // Live listeners for either Individual expenses OR Group + members + expenses
  useEffect(() => {
    if (!authReady || !authUser || !userProfile) {
      setGroup(null);
      setMembers([]);
      setExpenses([]);
      setGroupLoading(false);
      return;
    }

    if (userProfile.trackingMode === 'individual') {
      setGroup(null);
      setMembers([]);
      setGroupLoading(false);
      const soloPath = `users/${authUser.uid}/expenses`;
      const unsubSolo = onSnapshot(
        collection(db, 'users', authUser.uid, 'expenses'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as Expense);
          list.sort((a, b) => {
            if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
            const aTime = a.createdAt?.toMillis() ?? 0;
            const bTime = b.createdAt?.toMillis() ?? 0;
            return bTime - aTime;
          });
          setExpenses(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, soloPath);
        }
      );
      return () => unsubSolo();
    }

    const groupId = userProfile.activeGroupId;
    if (userProfile.trackingMode !== 'group' || !groupId) {
      setGroup(null);
      setMembers([]);
      setExpenses([]);
      setGroupLoading(false);
      return;
    }

    setGroupLoading(true);

    const groupPath = `groups/${groupId}`;
    const unsubGroup = onSnapshot(
      doc(db, 'groups', groupId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<Group>;
          setGroup({
            ...(data as Group),
            currency: data.currency ?? userProfile.currency ?? 'INR',
          });
        } else {
          setGroup(null);
        }
        setGroupLoading(false);
      },
      (error) => {
        setGroupLoading(false);
        handleFirestoreError(error, OperationType.GET, groupPath);
      }
    );

    const membersPath = `groups/${groupId}/members`;
    const unsubMembers = onSnapshot(
      collection(db, 'groups', groupId, 'members'),
      (snap) => {
        setMembers(snap.docs.map((d) => d.data() as GroupMember));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, membersPath);
      }
    );

    const expensesPath = `groups/${groupId}/expenses`;
    const unsubExpenses = onSnapshot(
      collection(db, 'groups', groupId, 'expenses'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Expense);
        list.sort((a, b) => {
          if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
          const aTime = a.createdAt?.toMillis() ?? 0;
          const bTime = b.createdAt?.toMillis() ?? 0;
          return bTime - aTime;
        });
        setExpenses(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, expensesPath);
      }
    );

    return () => {
      unsubGroup();
      unsubMembers();
      unsubExpenses();
    };
  }, [authReady, authUser, userProfile?.trackingMode, userProfile?.activeGroupId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  };

  const streak = useMemo(() => {
    if (!authUser) {
      return {
        streakDays: 0,
        loggedToday: false,
        status: 'idle' as const,
        loggedDateKeys: new Set<string>(),
      };
    }
    return computeStreak(expenses, authUser.uid, todayKey);
  }, [expenses, authUser, todayKey]);

  const effectiveCurrency: CurrencyCode =
    userProfile?.trackingMode === 'group' && group?.currency
      ? group.currency
      : userProfile?.currency || 'INR';

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Sign in was cancelled or failed.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setActiveTab('today');
  };

  const handleSaveExpense = async (payload: {
    amountCents: number;
    category: ExpenseCategory;
    note: string;
    dateKey: string;
    expenseId?: string;
  }) => {
    if (!userProfile) return;
    const targetGroupId =
      userProfile.trackingMode === 'group' ? userProfile.activeGroupId : '';

    if (payload.expenseId) {
      await updateExpense({
        groupId: targetGroupId,
        authorId: userProfile.uid,
        expenseId: payload.expenseId,
        authorName: userProfile.displayName,
        amountCents: payload.amountCents,
        category: payload.category,
        note: payload.note,
        dateKey: payload.dateKey,
      });
      setSelectedDateKey(payload.dateKey);
      showToast(`Updated ${formatCents(payload.amountCents, effectiveCurrency)}`);
    } else {
      const wasLoggedToday = streak.loggedToday;
      await addExpense({
        groupId: targetGroupId,
        authorId: userProfile.uid,
        authorName: userProfile.displayName,
        amountCents: payload.amountCents,
        category: payload.category,
        note: payload.note,
        dateKey: payload.dateKey,
      });
      setSelectedDateKey(payload.dateKey);
      setCelebrationTick((t) => t + 1);

      if (payload.dateKey === todayKey && !wasLoggedToday) {
        const nextStreak = streak.streakDays + 1;
        showToast(
          `Logged ${formatCents(payload.amountCents, effectiveCurrency)} · ${nextStreak}-day streak!`
        );
      } else {
        showToast(`Logged ${formatCents(payload.amountCents, effectiveCurrency)}`);
      }
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!userProfile) return;
    const targetGroupId =
      userProfile.trackingMode === 'group' ? userProfile.activeGroupId : '';
    await deleteExpense(targetGroupId, userProfile.uid, expenseId);
    showToast('Expense removed');
  };

  if (!authReady || (authUser && profileLoading && !userProfile)) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="font-display text-xl font-bold text-[#1A1D26]">PennyPals</div>
          <p className="text-xs text-[#687082]">Loading your daily budget...</p>
        </div>
      </div>
    );
  }

  if (!authUser || !userProfile) {
    return (
      <LandingPage
        onSignIn={handleSignIn}
        signingIn={signingIn}
        errorMsg={authError}
      />
    );
  }

  const needsSetup =
    userProfile.trackingMode === 'unset' ||
    (userProfile.trackingMode === 'group' && !userProfile.activeGroupId);

  if (needsSetup) {
    return (
      <GroupOnboarding
        user={userProfile}
        onStartIndividual={async ({
          dailyBudgetCents,
          currency,
          displayName,
          avatarKey,
          avatarColor,
        }) => {
          await activateIndividualMode({
            user: userProfile,
            dailyBudgetCents,
            currency,
            displayName,
            avatarKey,
            avatarColor,
          });
        }}
        onCreateGroup={async ({
          groupName,
          dailyBudgetCents,
          currency,
          displayName,
          avatarKey,
          avatarColor,
        }) => {
          await createGroupAndActivate({
            user: userProfile,
            groupName,
            dailyBudgetCents,
            currency,
            displayName,
            avatarKey,
            avatarColor,
          });
        }}
        onJoinGroup={async ({
          inviteCode,
          dailyBudgetCents,
          currency,
          displayName,
          avatarKey,
          avatarColor,
        }) => {
          await joinGroupByInviteCode({
            user: userProfile,
            inviteCodeInput: inviteCode,
            dailyBudgetCents,
            currency,
            displayName,
            avatarKey,
            avatarColor,
          });
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  if (userProfile.trackingMode === 'group' && groupLoading && !group) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="font-display text-xl font-bold text-[#1A1D26]">PennyPals</div>
          <p className="text-xs text-[#687082]">Opening your group...</p>
        </div>
      </div>
    );
  }

  const isGroupMode = userProfile.trackingMode === 'group' && Boolean(group);

  const navItems: { id: NavTab; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'group', label: 'Group' },
    { id: 'insights', label: 'Insights' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FB] pb-20 md:pb-12">
      {/* Desktop Top Bar (Strict 3-Zone Contract) */}
      <header className="hidden md:block bg-white/85 backdrop-blur-md border-b border-[#E7EAF2] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className="font-display text-xl font-bold tracking-tight text-[#1A1D26] whitespace-nowrap shrink-0"
          >
            PennyPals
          </button>

          <nav className="flex items-center gap-7" aria-label="Primary">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-[#1A1D26] font-semibold'
                      : 'text-[#687082] hover:text-[#1A1D26]'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-[1px] h-0.5 rounded-full bg-[#FF5D73]" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingExpense(null);
                setLoggerOpen(true);
              }}
              className="h-10 px-4 rounded-xl bg-[#FF5D73] hover:bg-[#EB4960] active:scale-[0.98] text-white text-sm font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expense</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Header */}
      <header className="md:hidden px-4 h-12 flex items-center justify-between border-b border-[#E7EAF2] bg-white">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className="font-display text-lg font-bold tracking-tight text-[#1A1D26] whitespace-nowrap shrink-0"
        >
          PennyPals
        </button>
        <span className="text-xs font-medium text-[#687082] truncate max-w-[180px]">
          {isGroupMode && group ? group.name : `Solo · ${effectiveCurrency}`}
        </span>
      </header>

      {/* Celebration Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed top-4 md:top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-2xl bg-[#1A1D26] text-white text-xs sm:text-sm font-semibold shadow-lg flex items-center gap-2 whitespace-nowrap"
            role="status"
          >
            <Sparkles className="w-4 h-4 text-[#FBBF24] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {activeTab === 'today' && (
          <TodayView
            userId={userProfile.uid}
            displayName={userProfile.displayName}
            avatarKey={userProfile.avatarKey}
            avatarColor={userProfile.avatarColor}
            dailyBudgetCents={userProfile.dailyBudgetCents}
            currency={effectiveCurrency}
            todayKey={todayKey}
            selectedDateKey={selectedDateKey}
            onSelectDate={setSelectedDateKey}
            expenses={expenses}
            streak={streak}
            celebrationTick={celebrationTick}
            onOpenLogger={() => {
              setEditingExpense(null);
              setLoggerOpen(true);
            }}
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setLoggerOpen(true);
            }}
          />
        )}

        {activeTab === 'group' && (
          <GroupView
            currentUserId={userProfile.uid}
            currency={effectiveCurrency}
            group={group}
            members={members}
            expenses={expenses}
            todayKey={todayKey}
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setLoggerOpen(true);
            }}
            onCreateGroup={async (groupName) => {
              await createGroupAndActivate({
                user: userProfile,
                groupName,
                dailyBudgetCents: userProfile.dailyBudgetCents,
                currency: userProfile.currency || 'INR',
              });
              showToast('Group created!');
            }}
            onJoinGroup={async (inviteCode) => {
              const joined = await joinGroupByInviteCode({
                user: userProfile,
                inviteCodeInput: inviteCode,
                dailyBudgetCents: userProfile.dailyBudgetCents,
                currency: userProfile.currency || 'INR',
              });
              showToast(`Joined ${joined.groupName}!`);
            }}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsView
            currentUserId={userProfile.uid}
            currency={effectiveCurrency}
            isGroupMode={isGroupMode}
            members={members}
            expenses={expenses}
            todayKey={todayKey}
            dailyBudgetCents={userProfile.dailyBudgetCents}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            user={userProfile}
            currency={effectiveCurrency}
            group={group}
            onSavePersonalSettings={async ({
              displayName,
              dailyBudgetCents,
              currency,
              avatarKey,
              avatarColor,
            }: {
              displayName: string;
              dailyBudgetCents: number;
              currency: CurrencyCode;
              avatarKey: AvatarKey;
              avatarColor: AvatarColorKey;
            }) => {
              await updatePersonalSettings({
                uid: userProfile.uid,
                email: userProfile.email,
                trackingMode: isGroupMode ? 'group' : 'individual',
                activeGroupId: userProfile.activeGroupId,
                displayName,
                avatarKey,
                avatarColor,
                currency,
                dailyBudgetCents,
              });
              showToast('Profile updated');
            }}
            onUpdateGroupDetails={async (newName, currency) => {
              if (!group) return;
              await updateGroupDetails(group.id, newName, currency);
              showToast('Group updated');
            }}
            onSwitchToIndividual={async () => {
              if (!group) return;
              await leaveGroupToIndividual(userProfile, group.id);
              setActiveTab('today');
              showToast('Switched to Individual Mode');
            }}
            onCreateGroup={async (groupName) => {
              await createGroupAndActivate({
                user: userProfile,
                groupName,
                dailyBudgetCents: userProfile.dailyBudgetCents,
                currency: userProfile.currency || 'INR',
              });
              showToast('Group created!');
            }}
            onJoinGroup={async (inviteCode) => {
              const joined = await joinGroupByInviteCode({
                user: userProfile,
                inviteCodeInput: inviteCode,
                dailyBudgetCents: userProfile.dailyBudgetCents,
                currency: userProfile.currency || 'INR',
              });
              showToast(`Joined ${joined.groupName}!`);
            }}
            onSignOut={handleSignOut}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E7EAF2] pb-safe"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5 items-center h-14 px-1">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'today' ? 'text-[#FF5D73]' : 'text-[#687082]'
            }`}
          >
            <CircleDollarSign className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Today</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('group')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'group' ? 'text-[#FF5D73]' : 'text-[#687082]'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Group</span>
          </button>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setEditingExpense(null);
                setLoggerOpen(true);
              }}
              aria-label="Log Expense"
              className="w-11 h-11 rounded-2xl bg-[#FF5D73] hover:bg-[#EB4960] active:scale-95 text-white flex items-center justify-center shadow-sm transition-transform"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('insights')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'insights' ? 'text-[#FF5D73]' : 'text-[#687082]'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Insights</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
              activeTab === 'settings' ? 'text-[#FF5D73]' : 'text-[#687082]'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Budget</span>
          </button>
        </div>
      </nav>

      {/* Quick Expense Logger / Editor Modal */}
      <AnimatePresence>
        {loggerOpen && (
          <ExpenseKeypadModal
            currency={effectiveCurrency}
            defaultDateKey={selectedDateKey}
            todayKey={todayKey}
            editingExpense={editingExpense}
            onClose={() => {
              setLoggerOpen(false);
              setEditingExpense(null);
            }}
            onSave={handleSaveExpense}
            onDelete={editingExpense ? handleDeleteExpense : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
