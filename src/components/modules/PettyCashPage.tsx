import { useEffect, useState } from 'react';
import { Wallet, Plus, CheckCircle, Clock, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/logger';
import { PettyCashShift, PettyCashExpense, Profile } from '../../lib/types';
import Modal from '../ui/Modal';

export default function PettyCashPage() {
  const { t } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const [shifts, setShifts] = useState<PettyCashShift[]>([]);
  const [currentShift, setCurrentShift] = useState<PettyCashShift | null>(null);
  const [expenses, setExpenses] = useState<PettyCashExpense[]>([]);
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [settleModal, setSettleModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);

  // Forms
  const [openForm, setOpenForm] = useState({ assigned_to: '', starting_cash: 0 });
  const [actualCash, setActualCash] = useState(0);
  const [expenseForm, setExpenseForm] = useState({ title: '', amount: 0 });
  const [saving, setSaving] = useState(false);

  async function load() {
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: sh }, { data: staff }] = await Promise.all([
      supabase.from('petty_cash_shifts').select('*').order('opened_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('is_active', true),
    ]);

    setShifts(sh ?? []);
    setStaffList(staff ?? []);

    const active = (sh ?? []).find(s => s.status === 'open' && s.shift_date === today &&
      (!isAdmin ? s.assigned_to === profile?.id : true));
    setCurrentShift(active ?? null);

    if (active) {
      const { data: exp } = await supabase.from('petty_cash_expenses')
        .select('*').eq('shift_id', active.id).order('created_at');
      setExpenses(exp ?? []);
    } else {
      setExpenses([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleOpenShift() {
    if (!openForm.assigned_to || openForm.starting_cash <= 0) return;
    setSaving(true);
    const assignee = staffList.find(s => s.id === openForm.assigned_to);
    await supabase.from('petty_cash_shifts').insert({
      assigned_to: openForm.assigned_to,
      assigned_to_name: assignee?.full_name ?? '',
      assigned_by: profile?.id,
      assigned_by_name: profile?.full_name ?? '',
      starting_cash: openForm.starting_cash,
      cash_sales: 0,
      total_expenses: 0,
      expected_cash: openForm.starting_cash,
      status: 'open',
      shift_date: new Date().toISOString().slice(0, 10),
      opened_at: new Date().toISOString(),
      notes: '',
    });
    logActivity(profile!.id, profile!.full_name, 'opened', 'petty_cash', undefined, { amount: openForm.starting_cash });
    await load();
    setOpenShiftModal(false);
    setSaving(false);
  }

  async function handleAddExpense() {
    if (!currentShift || !expenseForm.title || expenseForm.amount <= 0) return;
    setSaving(true);
    await supabase.from('petty_cash_expenses').insert({
      shift_id: currentShift.id,
      title: expenseForm.title,
      amount: expenseForm.amount,
      created_by: profile?.id,
      created_by_name: profile?.full_name ?? '',
    });
    const newTotal = currentShift.total_expenses + expenseForm.amount;
    const cashSales = currentShift.cash_sales;
    await supabase.from('petty_cash_shifts').update({
      total_expenses: newTotal,
      expected_cash: currentShift.starting_cash + cashSales - newTotal,
    }).eq('id', currentShift.id);

    logActivity(profile!.id, profile!.full_name, 'created', 'petty_cash_expense', currentShift.id, { title: expenseForm.title, amount: expenseForm.amount });
    await load();
    setExpenseForm({ title: '', amount: 0 });
    setExpenseModal(false);
    setSaving(false);
  }

  async function handleSettle() {
    if (!currentShift) return;
    setSaving(true);
    const diff = actualCash - currentShift.expected_cash;
    await supabase.from('petty_cash_shifts').update({
      actual_cash: actualCash,
      difference: diff,
      status: 'settled',
      settled_at: new Date().toISOString(),
    }).eq('id', currentShift.id);
    logActivity(profile!.id, profile!.full_name, 'settled', 'petty_cash', currentShift.id, { diff, actualCash });
    await load();
    setSettleModal(false);
    setSaving(false);
  }

  const diffStatus = (diff: number | null) => {
    if (diff === null) return null;
    if (diff === 0) return { label: t('balanced'), cls: 'bg-green-100 text-green-700' };
    if (diff > 0) return { label: `${t('surplus')} +${diff.toFixed(2)}`, cls: 'bg-blue-100 text-blue-700' };
    return { label: `${t('shortage')} ${diff.toFixed(2)}`, cls: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">{t('pettyCashModule')}</h1>
        {isAdmin && !currentShift && (
          <button onClick={() => setOpenShiftModal(true)}
            className="flex items-center gap-2 bg-[#00A09D] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#008f8c]">
            <Plus className="w-4 h-4" strokeWidth={1.5} />{t('openShift')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : currentShift ? (
        <div className="space-y-4">
          {/* Active shift card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#714B67] to-[#8a5d7e] px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-4 h-4" strokeWidth={1.5} />
                  <span className="font-semibold">{t('currentShift')}</span>
                  <span className="bg-green-400 text-white text-xs px-2 py-0.5 rounded-full">{t('shiftOpen')}</span>
                </div>
                <p className="text-white/70 text-sm mt-1">{t('assignedTo')}: <strong className="text-white">{currentShift.assigned_to_name}</strong></p>
              </div>
              <Wallet className="w-8 h-8 text-white/50" strokeWidth={1.5} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-gray-100">
              {[
                { label: t('startingCash'), value: currentShift.starting_cash, color: 'text-gray-700' },
                { label: t('cashSales'), value: currentShift.cash_sales, color: 'text-green-600' },
                { label: t('shiftExpenses'), value: currentShift.total_expenses, color: 'text-red-500' },
                { label: t('expectedCash'), value: currentShift.expected_cash, color: 'text-[#714B67] font-bold' },
              ].map((row, i) => (
                <div key={i} className="px-5 py-4">
                  <p className="text-xs text-gray-500">{row.label}</p>
                  <p className={`text-lg font-bold mt-1 ${row.color}`}>{row.value.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm">{t('shiftExpenses')}</h2>
              <button onClick={() => setExpenseModal(true)}
                className="flex items-center gap-1.5 text-[#00A09D] hover:bg-teal-50 px-3 py-1.5 rounded-lg text-xs font-medium">
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />{t('addShiftExpense')}
              </button>
            </div>
            {expenses.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">{t('noData')}</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {expenses.map(ex => (
                  <div key={ex.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{ex.title}</p>
                      <p className="text-xs text-gray-400">{new Date(ex.created_at).toLocaleTimeString()} · {ex.created_by_name}</p>
                    </div>
                    <span className="font-semibold text-red-500 text-sm">{ex.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settle button */}
          {(isAdmin || currentShift.assigned_to === profile?.id) && (
            <button onClick={() => { setActualCash(currentShift.expected_cash); setSettleModal(true); }}
              className="w-full bg-[#714B67] text-white py-3 rounded-xl font-semibold hover:bg-[#8a5d7e] flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" strokeWidth={1.5} />{t('settleShift')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center">
            <Wallet className="w-7 h-7 text-[#714B67]" strokeWidth={1.5} />
          </div>
          <p className="text-gray-500 text-sm">{isAdmin ? t('openShift') + ' to start' : t('noActiveShift')}</p>
        </div>
      )}

      {/* History */}
      {shifts.filter(s => s.status === 'settled').length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">{t('shiftHistory')}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {shifts.filter(s => s.status === 'settled').slice(0, 10).map(s => {
              const ds = diffStatus(s.difference);
              return (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{s.shift_date} · {s.assigned_to_name}</p>
                    <p className="text-xs text-gray-400">{t('startingCash')}: {s.starting_cash.toFixed(2)}</p>
                  </div>
                  {ds && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ds.cls}`}>{ds.label}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Open Shift Modal */}
      {openShiftModal && (
        <Modal title={t('openShift')} onClose={() => setOpenShiftModal(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('assignedTo')}</label>
              <select value={openForm.assigned_to} onChange={e => setOpenForm(f => ({ ...f, assigned_to: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30">
                <option value="">-- Select --</option>
                {staffList.filter(s => s.role === 'staff').map(s => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('startingCash')}</label>
              <input type="number" value={openForm.starting_cash}
                onChange={e => setOpenForm(f => ({ ...f, starting_cash: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setOpenShiftModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
            <button onClick={handleOpenShift} disabled={saving}
              className="px-5 py-2 bg-[#00A09D] text-white text-sm font-medium rounded-xl hover:bg-[#008f8c] disabled:opacity-60">
              {saving ? t('loading') : t('openShift')}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Expense Modal */}
      {expenseModal && (
        <Modal title={t('addShiftExpense')} onClose={() => setExpenseModal(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('description')}</label>
              <input value={expenseForm.title} onChange={e => setExpenseForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('amount')}</label>
              <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setExpenseModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
            <button onClick={handleAddExpense} disabled={saving}
              className="px-5 py-2 bg-[#00A09D] text-white text-sm font-medium rounded-xl hover:bg-[#008f8c] disabled:opacity-60">
              {saving ? t('loading') : t('save')}
            </button>
          </div>
        </Modal>
      )}

      {/* Settle Modal */}
      {settleModal && currentShift && (
        <Modal title={t('settleShift')} onClose={() => setSettleModal(false)} size="sm">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              {[
                { label: t('startingCash'), value: currentShift.starting_cash },
                { label: t('cashSales'), value: currentShift.cash_sales },
                { label: t('shiftExpenses'), value: -currentShift.total_expenses },
                { label: t('expectedCash'), value: currentShift.expected_cash, bold: true },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between ${row.bold ? 'font-bold text-[#714B67] text-base border-t border-gray-200 pt-2' : 'text-gray-600'}`}>
                  <span>{row.label}</span>
                  <span className={row.value < 0 ? 'text-red-500' : ''}>{row.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('actualCash')}</label>
              <input type="number" value={actualCash} onChange={e => setActualCash(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
            </div>
            {(() => {
              const diff = actualCash - currentShift.expected_cash;
              const ds = diffStatus(diff);
              return ds && (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${ds.cls}`}>
                  {diff === 0 ? <CheckCircle className="w-4 h-4" strokeWidth={1.5} /> : <AlertCircle className="w-4 h-4" strokeWidth={1.5} />}
                  {t('difference')}: {diff.toFixed(2)} — {ds.label}
                </div>
              );
            })()}
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setSettleModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
            <button onClick={handleSettle} disabled={saving}
              className="px-5 py-2 bg-[#714B67] text-white text-sm font-medium rounded-xl hover:bg-[#8a5d7e] disabled:opacity-60">
              {saving ? t('loading') : t('settleShift')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
