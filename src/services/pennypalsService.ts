import { type User } from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AVATAR_KEYS,
  CURRENCY_MAP,
  type AvatarColorKey,
  type AvatarKey,
  type CurrencyCode,
  type ExpenseCategory,
  type UserProfile,
} from '../types';

function generateRandomId(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export function sanitizeDisplayName(name: string | null | undefined, email?: string | null): string {
  const trimmed = (name || '').trim();
  if (trimmed.length >= 1) {
    return trimmed.slice(0, 60);
  }
  if (email && email.includes('@')) {
    return email.split('@')[0].slice(0, 60) || 'PennyPal';
  }
  return 'PennyPal';
}

export function clampBudgetCents(cents: number): number {
  const rounded = Math.round(cents);
  return Math.max(100, Math.min(100000000, rounded));
}

export function clampAmountCents(cents: number): number {
  const rounded = Math.round(cents);
  return Math.max(1, Math.min(100000000, rounded));
}

export function sanitizeGroupName(name: string): string {
  const trimmed = name.trim();
  return (trimmed || 'My PennyPals').slice(0, 50);
}

export function sanitizeNote(note: string): string {
  return note.trim().slice(0, 120);
}

export function normalizeCurrency(code: string | undefined): CurrencyCode {
  if (code && code in CURRENCY_MAP) {
    return code as CurrencyCode;
  }
  return 'INR';
}

const VALID_COLORS: AvatarColorKey[] = [
  'coral',
  'mint',
  'sky',
  'lavender',
  'buttercup',
  'peach',
];

export async function ensureUserProfile(authUser: User): Promise<UserProfile> {
  const userPath = `users/${authUser.uid}`;
  const userRef = doc(db, 'users', authUser.uid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (snap.exists()) {
    const raw = snap.data() as Partial<UserProfile>;
    // Backfill trackingMode/currency seamlessly for users created before multi-currency/solo update
    if (!raw.trackingMode || !raw.currency) {
      const trackingMode = raw.activeGroupId ? 'group' : 'unset';
      const currency = normalizeCurrency(raw.currency);
      try {
        await updateDoc(userRef, {
          trackingMode,
          currency,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, userPath);
      }
      return {
        ...(raw as UserProfile),
        trackingMode,
        currency,
      };
    }
    return raw as UserProfile;
  }

  const colorIdx = authUser.uid.charCodeAt(0) % VALID_COLORS.length;
  const keyIdx = authUser.uid.charCodeAt(authUser.uid.length - 1) % AVATAR_KEYS.length;

  const newProfile = {
    uid: authUser.uid,
    email: (authUser.email || 'member@pennypals.app').slice(0, 254),
    displayName: sanitizeDisplayName(authUser.displayName, authUser.email),
    avatarColor: VALID_COLORS[colorIdx],
    avatarKey: AVATAR_KEYS[keyIdx],
    trackingMode: 'unset' as const,
    currency: 'INR' as const,
    activeGroupId: '',
    dailyBudgetCents: 50000, // ₹500 default daily budget
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(userRef, newProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  return {
    ...newProfile,
    createdAt: undefined,
    updatedAt: undefined,
  };
}

export async function activateIndividualMode(params: {
  user: UserProfile;
  dailyBudgetCents: number;
  currency: CurrencyCode;
  displayName?: string;
  avatarKey?: AvatarKey;
  avatarColor?: AvatarColorKey;
}): Promise<void> {
  const { user } = params;
  const cleanDisplayName = sanitizeDisplayName(params.displayName ?? user.displayName, user.email);
  const cleanBudget = clampBudgetCents(params.dailyBudgetCents);
  const currency = normalizeCurrency(params.currency);
  const avatarKey = params.avatarKey ?? user.avatarKey;
  const avatarColor = params.avatarColor ?? user.avatarColor;
  const path = `users/${user.uid}`;

  try {
    await updateDoc(doc(db, 'users', user.uid), {
      displayName: cleanDisplayName,
      avatarColor,
      avatarKey,
      trackingMode: 'individual',
      currency,
      activeGroupId: '',
      dailyBudgetCents: cleanBudget,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createGroupAndActivate(params: {
  user: UserProfile;
  groupName: string;
  dailyBudgetCents: number;
  currency: CurrencyCode;
  displayName?: string;
  avatarKey?: AvatarKey;
  avatarColor?: AvatarColorKey;
}): Promise<string> {
  const { user } = params;
  const groupId = generateRandomId(20);
  const inviteCode = generateInviteCode(8);
  const cleanGroupName = sanitizeGroupName(params.groupName);
  const cleanDisplayName = sanitizeDisplayName(params.displayName ?? user.displayName, user.email);
  const cleanBudget = clampBudgetCents(params.dailyBudgetCents);
  const currency = normalizeCurrency(params.currency);
  const avatarKey = params.avatarKey ?? user.avatarKey;
  const avatarColor = params.avatarColor ?? user.avatarColor;

  const batch = writeBatch(db);

  const groupRef = doc(db, 'groups', groupId);
  const inviteRef = doc(db, 'groupInvites', inviteCode);
  const memberRef = doc(db, 'groups', groupId, 'members', user.uid);
  const userRef = doc(db, 'users', user.uid);

  batch.set(groupRef, {
    id: groupId,
    name: cleanGroupName,
    inviteCode,
    currency,
    createdBy: user.uid,
    memberIds: [user.uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(inviteRef, {
    inviteCode,
    groupId,
    groupName: cleanGroupName,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });

  batch.set(memberRef, {
    uid: user.uid,
    groupId,
    displayName: cleanDisplayName,
    avatarColor,
    avatarKey,
    dailyBudgetCents: cleanBudget,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.update(userRef, {
    displayName: cleanDisplayName,
    avatarColor,
    avatarKey,
    trackingMode: 'group',
    currency,
    dailyBudgetCents: cleanBudget,
    activeGroupId: groupId,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `groups/${groupId}`);
  }

  return groupId;
}

export async function joinGroupByInviteCode(params: {
  user: UserProfile;
  inviteCodeInput: string;
  dailyBudgetCents: number;
  currency?: CurrencyCode;
  displayName?: string;
  avatarKey?: AvatarKey;
  avatarColor?: AvatarColorKey;
}): Promise<{ groupId: string; groupName: string }> {
  const normalizedCode = params.inviteCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalizedCode.length < 6 || normalizedCode.length > 12) {
    throw new Error('Please enter a valid 6–12 character invite code.');
  }

  const invitePath = `groupInvites/${normalizedCode}`;
  const inviteRef = doc(db, 'groupInvites', normalizedCode);
  let inviteSnap;
  try {
    inviteSnap = await getDoc(inviteRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, invitePath);
  }

  if (!inviteSnap.exists()) {
    throw new Error('No group found with that invite code. Check the letters and try again.');
  }

  const inviteData = inviteSnap.data() as { groupId: string; groupName: string };
  const groupId = inviteData.groupId;

  const groupPath = `groups/${groupId}`;
  const groupRef = doc(db, 'groups', groupId);

  let currentMemberIds: string[] | null = null;
  let groupCurrency: CurrencyCode | undefined;
  try {
    const existingGroup = await getDoc(groupRef);
    if (existingGroup.exists()) {
      const data = existingGroup.data() as { memberIds: string[]; currency?: CurrencyCode };
      currentMemberIds = data.memberIds;
      groupCurrency = data.currency;
    }
  } catch {
    // Expected when not yet a member
  }

  const cleanDisplayName = sanitizeDisplayName(
    params.displayName ?? params.user.displayName,
    params.user.email
  );
  const cleanBudget = clampBudgetCents(params.dailyBudgetCents);
  const currency = normalizeCurrency(groupCurrency ?? params.currency ?? params.user.currency);
  const avatarKey = params.avatarKey ?? params.user.avatarKey;
  const avatarColor = params.avatarColor ?? params.user.avatarColor;

  const memberRef = doc(db, 'groups', groupId, 'members', params.user.uid);
  const userRef = doc(db, 'users', params.user.uid);

  const batch = writeBatch(db);

  if (currentMemberIds && currentMemberIds.includes(params.user.uid)) {
    batch.set(
      memberRef,
      {
        uid: params.user.uid,
        groupId,
        displayName: cleanDisplayName,
        avatarColor,
        avatarKey,
        dailyBudgetCents: cleanBudget,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: false }
    );
  } else {
    batch.update(groupRef, {
      memberIds: arrayUnion(params.user.uid),
      updatedAt: serverTimestamp(),
    });
    batch.set(memberRef, {
      uid: params.user.uid,
      groupId,
      displayName: cleanDisplayName,
      avatarColor,
      avatarKey,
      dailyBudgetCents: cleanBudget,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  batch.update(userRef, {
    displayName: cleanDisplayName,
    avatarColor,
    avatarKey,
    trackingMode: 'group',
    currency,
    dailyBudgetCents: cleanBudget,
    activeGroupId: groupId,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, groupPath);
  }

  return { groupId, groupName: inviteData.groupName };
}

export async function leaveGroupToIndividual(user: UserProfile, groupId: string): Promise<void> {
  const batch = writeBatch(db);
  const groupRef = doc(db, 'groups', groupId);
  const memberRef = doc(db, 'groups', groupId, 'members', user.uid);
  const userRef = doc(db, 'users', user.uid);

  batch.update(groupRef, {
    memberIds: arrayRemove(user.uid),
    updatedAt: serverTimestamp(),
  });
  batch.delete(memberRef);
  batch.update(userRef, {
    trackingMode: 'individual',
    activeGroupId: '',
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `groups/${groupId}`);
  }
}

export async function updateGroupDetails(
  groupId: string,
  newName: string,
  currency: CurrencyCode
): Promise<void> {
  const cleanName = sanitizeGroupName(newName);
  const cleanCurrency = normalizeCurrency(currency);
  const groupPath = `groups/${groupId}`;
  try {
    await updateDoc(doc(db, 'groups', groupId), {
      name: cleanName,
      currency: cleanCurrency,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, groupPath);
  }
}

export async function updatePersonalSettings(params: {
  uid: string;
  email: string;
  trackingMode: 'individual' | 'group';
  activeGroupId: string;
  displayName: string;
  avatarKey: AvatarKey;
  avatarColor: AvatarColorKey;
  currency: CurrencyCode;
  dailyBudgetCents: number;
}): Promise<void> {
  const cleanName = sanitizeDisplayName(params.displayName, params.email);
  const cleanBudget = clampBudgetCents(params.dailyBudgetCents);
  const cleanCurrency = normalizeCurrency(params.currency);
  const batch = writeBatch(db);

  const userRef = doc(db, 'users', params.uid);
  batch.update(userRef, {
    displayName: cleanName,
    avatarKey: params.avatarKey,
    avatarColor: params.avatarColor,
    trackingMode: params.trackingMode,
    currency: cleanCurrency,
    dailyBudgetCents: cleanBudget,
    updatedAt: serverTimestamp(),
  });

  if (params.trackingMode === 'group' && params.activeGroupId) {
    const memberRef = doc(db, 'groups', params.activeGroupId, 'members', params.uid);
    batch.update(memberRef, {
      displayName: cleanName,
      avatarKey: params.avatarKey,
      avatarColor: params.avatarColor,
      dailyBudgetCents: cleanBudget,
      updatedAt: serverTimestamp(),
    });

    const groupRef = doc(db, 'groups', params.activeGroupId);
    batch.update(groupRef, {
      currency: cleanCurrency,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${params.uid}`);
  }
}

export async function addExpense(params: {
  groupId: string; // empty string for individual mode
  authorId: string;
  authorName: string;
  amountCents: number;
  category: ExpenseCategory;
  note: string;
  dateKey: string;
}): Promise<string> {
  const expenseId = generateRandomId(20);
  const isGroup = Boolean(params.groupId);
  const path = isGroup
    ? `groups/${params.groupId}/expenses/${expenseId}`
    : `users/${params.authorId}/expenses/${expenseId}`;
  const expenseRef = isGroup
    ? doc(db, 'groups', params.groupId, 'expenses', expenseId)
    : doc(db, 'users', params.authorId, 'expenses', expenseId);

  try {
    await setDoc(expenseRef, {
      id: expenseId,
      groupId: isGroup ? params.groupId : '',
      authorId: params.authorId,
      authorName: sanitizeDisplayName(params.authorName),
      amountCents: clampAmountCents(params.amountCents),
      category: params.category,
      note: sanitizeNote(params.note),
      dateKey: params.dateKey,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return expenseId;
}

export async function updateExpense(params: {
  groupId: string; // empty string for individual mode
  authorId: string;
  expenseId: string;
  authorName: string;
  amountCents: number;
  category: ExpenseCategory;
  note: string;
  dateKey: string;
}): Promise<void> {
  const isGroup = Boolean(params.groupId);
  const path = isGroup
    ? `groups/${params.groupId}/expenses/${params.expenseId}`
    : `users/${params.authorId}/expenses/${params.expenseId}`;
  const expenseRef = isGroup
    ? doc(db, 'groups', params.groupId, 'expenses', params.expenseId)
    : doc(db, 'users', params.authorId, 'expenses', params.expenseId);

  try {
    await updateDoc(expenseRef, {
      authorName: sanitizeDisplayName(params.authorName),
      amountCents: clampAmountCents(params.amountCents),
      category: params.category,
      note: sanitizeNote(params.note),
      dateKey: params.dateKey,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteExpense(
  groupId: string,
  authorId: string,
  expenseId: string
): Promise<void> {
  const isGroup = Boolean(groupId);
  const path = isGroup
    ? `groups/${groupId}/expenses/${expenseId}`
    : `users/${authorId}/expenses/${expenseId}`;
  const expenseRef = isGroup
    ? doc(db, 'groups', groupId, 'expenses', expenseId)
    : doc(db, 'users', authorId, 'expenses', expenseId);

  try {
    await deleteDoc(expenseRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
