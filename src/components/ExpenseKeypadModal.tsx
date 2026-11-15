import { Check, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import {
  CATEGORIES,
  CURRENCY_MAP,
  type CurrencyCode,
  type Expense,
  type ExpenseCategory,
} from '../types';
import { formatCents } from '../utils/finance';
import { CategoryIcon } from './BuddyAvatar';

interface ExpenseKeypadModalProps {
  currency: CurrencyCode;
  defaultDateKey: string;
  todayKey: string;
  editingExpense: Expense | null;
  onClose: () => void;
  onSave: (payload: {
    amountCents: number;
    category: ExpenseCategory;
    note: string;
    dateKey: string;
    expenseId?: string;
  }) => Promise<void>;
  onDelete?: (expenseId: string) => Promise<void>;
}

export function ExpenseKeypadModal({
  currency,
  defaultDateKey,
  todayKey,
  editingExpense,
  onClose,
  onSave,
  onDelete,
}: ExpenseKeypadModalProps) {
  const currencyMeta = CURRENCY_MAP[currency] || CURRENCY_MAP.INR;
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [amountStr, setAmountStr] = useState<string>(() => {
    if (!editingExpense) return '';
    const major = editingExpense.amountCents / 100;
    return Number.isInteger(major) ? String(major) : major.toFixed(2);
  });
  const [category, setCategory] = useState<ExpenseCategory>(
    editingExpense?.category ?? 'coffee'
  );
  const [note, setNote] = useState<string>(editingExpense?.note ?? '');
  const [dateKey, setDateKey] = useState<string>(
    editingExpense?.dateKey ?? defaultDateKey
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const parsedAmount = Number.parseFloat(amountStr || '0');
  const amountCents = Number.isFinite(parsedAmount)
    ? Math.round(parsedAmount * 100)
    : 0;
  const isValidAmount = amountCents >= 1 && amountCents <= 100000000;

  useEffect(() => {
    amountInputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleAmountChange = (raw: string) => {
    setErrorMsg(null);
    // Keep only digits and a single decimal point with up to 2 decimal places
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    const whole = parts[0].slice(0, 6);
    const next = parts.length === 2 ? `${whole}.${parts[1].slice(0, 2)}` : whole;
    setAmountStr(next);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isValidAmount) {
      setErrorMsg(`Enter an amount greater than ${currencyMeta.symbol}0`);
      amountInputRef.current?.focus();
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      setErrorMsg('Choose a valid date');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSave({
        amountCents,
        category,
        note: note.trim().slice(0, 120),
        dateKey,
        expenseId: editingExpense?.id,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save expense.');
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingExpense || !onDelete) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onDelete(editingExpense.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not delete expense.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#1A1D26]/40 backdrop-blur-xs p-0 md:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <motion.div
        initial={{ y: 36, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl border border-[#E7EAF2] shadow-xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        <div className="md:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-[#DCE1EC]" />
        </div>

        <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-[#F1F3F8]">
          <h2 id="expense-modal-title" className="font-display text-lg font-semibold text-[#1A1D26]">
            {editingExpense ? 'Edit Expense' : 'Log Expense'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-[#687082] hover:text-[#1A1D26] hover:bg-[#F7F8FB] transition-colors"
            aria-label="Close expense sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-5">
          {/* Direct Amount Input */}
          <div className="text-center pt-1">
            <label htmlFor="expense-amount-input" className="sr-only">
              Amount
            </label>
            <div className="inline-flex items-baseline justify-center gap-1.5 px-4 py-2 rounded-2xl bg-[#F7F8FB] border border-[#E7EAF2] focus-within:border-[#FF5D73] focus-within:bg-white transition-colors">
              <span className="font-display text-2xl font-semibold text-[#687082] select-none">
                {currencyMeta.symbol}
              </span>
              <input
                ref={amountInputRef}
                id="expense-amount-input"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-36 bg-transparent font-display text-4xl sm:text-5xl font-bold tracking-tight tabular-nums text-[#1A1D26] placeholder:text-[#B5BCCB] focus:outline-none text-left"
              />
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#687082]">
              {currencyMeta.quickLogPresetsMajor.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setAmountStr(String(amt));
                    setErrorMsg(null);
                  }}
                  className="min-h-[34px] px-3 py-1 rounded-xl bg-[#F7F8FB] hover:bg-[#EDF0F6] text-[#1A1D26] font-semibold tabular-nums transition-colors"
                >
                  {currencyMeta.symbol}
                  {amt}
                </button>
              ))}
            </div>
          </div>

          {/* Category grid */}
          <div>
            <div className="text-xs font-medium text-[#687082] mb-2">Category</div>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`min-h-[64px] flex flex-col items-center justify-center gap-1 rounded-2xl border p-1.5 transition-all ${
                      active
                        ? 'border-[#FF5D73] bg-[#FFF4F6] ring-1 ring-[#FF5D73]'
                        : 'border-[#E7EAF2] bg-white hover:bg-[#F7F8FB]'
                    }`}
                  >
                    <CategoryIcon category={cat.id} size="sm" />
                    <span className="text-[11px] font-medium text-[#1A1D26] whitespace-nowrap truncate max-w-full">
                      {cat.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            <div className="sm:col-span-3">
              <label htmlFor="expense-note" className="sr-only">
                Note
              </label>
              <input
                id="expense-note"
                type="text"
                maxLength={120}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Quick note (optional)"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm text-[#1A1D26] placeholder:text-[#8E96A8] focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="expense-date" className="sr-only">
                Date
              </label>
              <input
                id="expense-date"
                type="date"
                max={todayKey}
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#F7F8FB] border border-[#E7EAF2] text-sm text-[#1A1D26] tabular-nums focus:outline-none focus:border-[#FF5D73] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-[#BE123C] text-center" role="alert">
              {errorMsg}
            </p>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2.5 pt-1 pb-safe">
            {editingExpense && onDelete && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className={`h-12 px-4 rounded-2xl font-medium text-sm flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  confirmingDelete
                    ? 'bg-[#BE123C] text-white hover:bg-[#9F1239]'
                    : 'bg-[#FFF0F2] text-[#BE123C] hover:bg-[#FFE0E5]'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>{confirmingDelete ? 'Confirm Delete' : 'Delete'}</span>
              </button>
            )}

            <button
              type="submit"
              disabled={submitting || !isValidAmount}
              className="flex-1 h-12 px-5 rounded-2xl bg-[#FF5D73] hover:bg-[#EB4960] disabled:bg-[#E2E6EF] disabled:text-[#8E96A8] text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Saving...'
                  : editingExpense
                    ? `Save ${isValidAmount ? formatCents(amountCents, currency) : ''}`
                    : `Log ${isValidAmount ? formatCents(amountCents, currency) : 'Expense'}`}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
