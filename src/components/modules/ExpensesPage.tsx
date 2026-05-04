import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Receipt } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/logger';
import { Expense } from '../../lib/types';
import Modal from '../ui/Modal';

const CATEGORIES = ['rent', 'utilities', 'salary', 'marketing', 'other'];
const EMPTY: Partial<Expense> = {
  title: '', title_ar: '', category: 'other', amount: 0,
  expense_date: new Date().toISOString().slice(0, 10), notes: '',
};

export default function ExpensesPage() {
  const { t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<Partial<Expense>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    setExpenses(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = expenses.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  async function save() {
    setSaving(true);
    if (modal === 'add') {
      await supabase.from('expenses').insert({ ...form, created_by: profile?.id });
      logActivity(profile!.id, profile!.full_name, 'created', 'expense', undefined, { title: form.title });
    } else {
      await supabase.from('expenses').update({ ...form, updated_at: new Date().toISOString() }).eq('id', form.id!);
      logActivity(profile!.id, profile!.full_name, 'updated', 'expense', form.id);
    }
    await load();
    setModal(null);
    setSaving(false);
  }

  async function remove(id: string) {
    await supabase.from('expenses').delete().eq('id', id);
    logActivity(profile!.id, profile!.full_name, 'deleted', 'expense', id);
    setDeleteId(null);
    await load();
  }

  const F = (k: keyof Expense, type = 'text') => (
    <input type={type} value={(form[k] as any) ?? ''}
      onChange={e => setForm(f => ({ ...f, [k]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
  );

  const catColors: Record<string, string> = {
    rent: 'bg-blue-100 text-blue-600',
    utilities: 'bg-yellow-100 text-yellow-600',
    salary: 'bg-purple-100 text-purple-600',
    marketing: 'bg-pink-100 text-pink-600',
    other: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 relative min-w-48">
          <Search className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`} strokeWidth={1.5} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
            className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 bg-white ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-500">
          {t('total')}: {total.toFixed(2)}
        </div>
        <button onClick={() => { setForm(EMPTY); setModal('add'); }}
          className="flex items-center gap-2 bg-[#00A09D] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#008f8c]">
          <Plus className="w-4 h-4" strokeWidth={1.5} />{t('addExpense')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('expenseTitle')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('expenseCategory')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('date')}</th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500 uppercase">{t('amount')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center">
                    <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-gray-400">{t('noData')}</p>
                  </td></tr>
                )}
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{isRTL && e.title_ar ? e.title_ar : e.title}</p>
                      {e.notes && <p className="text-xs text-gray-400 truncate max-w-xs">{e.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${catColors[e.category] ?? catColors.other}`}>
                        {t(e.category as any)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{e.expense_date}</td>
                    <td className="px-4 py-3 text-end font-semibold text-red-500">{e.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setForm({ ...e }); setModal('edit'); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100">
                          <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        <button onClick={() => setDeleteId(e.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100">
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? t('addExpense') : t('editExpense')} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('expenseTitle')}</label>{F('title')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('expenseTitleAr')}</label>{F('title_ar')}</div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('expenseCategory')}</label>
              <select value={form.category ?? 'other'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{t(c as any)}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('amount')}</label>{F('amount', 'number')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('expenseDate')}</label>{F('expense_date', 'date')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('notes')}</label>{F('notes')}</div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
            <button onClick={save} disabled={saving}
              className="px-5 py-2 bg-[#00A09D] text-white text-sm font-medium rounded-xl hover:bg-[#008f8c] disabled:opacity-60">
              {saving ? t('loading') : t('save')}
            </button>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title={t('delete')} onClose={() => setDeleteId(null)} size="sm">
          <p className="text-sm text-gray-600 mb-5">{t('areYouSure')}</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
            <button onClick={() => remove(deleteId)} className="px-5 py-2 bg-red-500 text-white text-sm font-medium rounded-xl">{t('delete')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
