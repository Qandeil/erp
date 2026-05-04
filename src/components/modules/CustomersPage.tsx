import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, DollarSign, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/logger';
import { Customer } from '../../lib/types';
import Modal from '../ui/Modal';

const EMPTY: Partial<Customer> = {
  name: '', name_ar: '', phone: '', email: '', address: '', notes: '', is_active: true,
};

export default function CustomersPage() {
  const { t, isRTL } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | 'payment' | null>(null);
  const [form, setForm] = useState<Partial<Customer>>(EMPTY);
  const [payAmount, setPayAmount] = useState(0);
  const [payNotes, setPayNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('customers').select('*').order('name');
    setCustomers(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  );

  async function save() {
    setSaving(true);
    if (modal === 'add') {
      await supabase.from('customers').insert({ ...form, total_debt: 0, created_by: profile?.id });
      logActivity(profile!.id, profile!.full_name, 'created', 'customer', undefined, { name: form.name });
    } else {
      await supabase.from('customers').update({ ...form, updated_at: new Date().toISOString() }).eq('id', form.id!);
      logActivity(profile!.id, profile!.full_name, 'updated', 'customer', form.id, { name: form.name });
    }
    await load();
    setModal(null);
    setSaving(false);
  }

  async function recordPayment() {
    if (!form.id || payAmount <= 0) return;
    setSaving(true);
    const customer = customers.find(c => c.id === form.id);
    if (!customer) return;
    const newDebt = Math.max(0, customer.total_debt - payAmount);
    await supabase.from('customers').update({ total_debt: newDebt, updated_at: new Date().toISOString() }).eq('id', form.id);
    // Record payment log
    await supabase.from('debt_payments').insert({
      customer_id: form.id,
      customer_name: customer.name,
      amount: payAmount,
      notes: payNotes,
      created_by: profile?.id,
    });
    logActivity(profile!.id, profile!.full_name, 'payment', 'customer', form.id, { amount: payAmount, remaining: newDebt });
    await load();
    setModal(null);
    setPayAmount(0);
    setPayNotes('');
    setSaving(false);
  }

  async function remove(id: string) {
    await supabase.from('customers').delete().eq('id', id);
    logActivity(profile!.id, profile!.full_name, 'deleted', 'customer', id);
    setDeleteId(null);
    await load();
  }

  const F = (k: keyof Customer) => (
    <input value={(form[k] as any) ?? ''}
      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 relative min-w-48">
          <Search className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`} strokeWidth={1.5} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('search')}
            className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 bg-white ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`} />
        </div>
        <button onClick={() => { setForm(EMPTY); setModal('add'); }}
          className="flex items-center gap-2 bg-[#00A09D] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#008f8c]">
          <Plus className="w-4 h-4" strokeWidth={1.5} />{t('addCustomer')}
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
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('name')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('phone')}</th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500 uppercase">{t('totalDebt')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-gray-400">{t('noData')}</p>
                  </td></tr>
                )}
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{isRTL && c.name_ar ? c.name_ar : c.name}</p>
                      {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-end">
                      {c.total_debt > 0
                        ? <span className="font-bold text-orange-500">{c.total_debt.toFixed(2)}</span>
                        : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {c.total_debt > 0 && (
                          <button onClick={() => { setForm({ ...c }); setPayAmount(0); setModal('payment'); }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-50 text-green-500 hover:bg-green-100">
                            <DollarSign className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        )}
                        <button onClick={() => { setForm({ ...c }); setModal('edit'); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100">
                          <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        {isAdmin && (
                          <button onClick={() => setDeleteId(c.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100">
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? t('addCustomer') : t('editCustomer')} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('customerName')}</label>{F('name')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('customerNameAr')}</label>{F('name_ar')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('phone')}</label>{F('phone')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('email')}</label>{F('email')}</div>
            <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">{t('address')}</label>{F('address')}</div>
            <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">{t('notes')}</label>{F('notes')}</div>
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

      {/* Payment Modal */}
      {modal === 'payment' && (
        <Modal title={t('recordPayment')} onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <div className="bg-orange-50 rounded-xl px-4 py-3 text-sm">
              <p className="text-gray-600">{form.name}</p>
              <p className="font-bold text-orange-600">{t('totalDebt')}: {(form.total_debt ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('paymentAmount')}</label>
              <input type="number" value={payAmount} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                max={form.total_debt ?? 0}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('notes')}</label>
              <input value={payNotes} onChange={e => setPayNotes(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
            <button onClick={recordPayment} disabled={saving}
              className="px-5 py-2 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 disabled:opacity-60">
              {saving ? t('loading') : t('confirm')}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <Modal title={t('deleteProduct')} onClose={() => setDeleteId(null)} size="sm">
          <p className="text-sm text-gray-600 mb-5">{t('areYouSure')}</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
            <button onClick={() => remove(deleteId)} className="px-5 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600">{t('delete')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
