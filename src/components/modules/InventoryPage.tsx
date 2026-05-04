import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/logger';
import { Product } from '../../lib/types';
import Modal from '../ui/Modal';

const EMPTY: Partial<Product> = {
  name: '', name_ar: '', sku: '', barcode: '', cost_price: 0,
  sale_price: 0, stock_quantity: 0, low_stock_threshold: 10,
  category: '', unit: 'pcs', is_active: true,
};

export default function InventoryPage() {
  const { t, isRTL } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState<Partial<Product>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.name_ar.includes(search) ||
    (p.barcode ?? '').includes(search) ||
    (p.sku ?? '').includes(search)
  );

  async function save() {
    setSaving(true);
    if (modal === 'add') {
      const { error } = await supabase.from('products').insert({ ...form, created_by: profile?.id });
      if (!error) logActivity(profile!.id, profile!.full_name, 'created', 'product', undefined, { name: form.name });
    } else {
      const { error } = await supabase.from('products').update({ ...form, updated_at: new Date().toISOString() }).eq('id', form.id!);
      if (!error) logActivity(profile!.id, profile!.full_name, 'updated', 'product', form.id, { name: form.name });
    }
    await load();
    setModal(null);
    setSaving(false);
  }

  async function remove(id: string) {
    await supabase.from('products').delete().eq('id', id);
    logActivity(profile!.id, profile!.full_name, 'deleted', 'product', id);
    setDeleteId(null);
    await load();
  }

  function stockBadge(p: Product) {
    if (p.stock_quantity === 0) return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">{t('outOfStock')}</span>;
    if (p.stock_quantity <= p.low_stock_threshold) return <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{t('lowStock')}</span>;
    return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-xs font-medium">{t('inStock')}</span>;
  }

  const F = (k: keyof Product, type: string = 'text') => (
    <input
      type={type}
      value={(form[k] as any) ?? ''}
      onChange={e => setForm(f => ({ ...f, [k]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 focus:border-[#714B67]"
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 relative min-w-48">
          <Search className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`} strokeWidth={1.5} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('search')}
            className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
          />
        </div>
        {isAdmin && (
          <button onClick={() => { setForm(EMPTY); setModal('add'); }}
            className="flex items-center gap-2 bg-[#00A09D] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#008f8c] transition-colors">
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            {t('addProduct')}
          </button>
        )}
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
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('productName')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('barcode')}</th>
                  {isAdmin && <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500 uppercase">{t('costPrice')}</th>}
                  <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500 uppercase">{t('salePrice')}</th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500 uppercase">{t('stockQuantity')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('status')}</th>
                  {isAdmin && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center">
                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-gray-400">{t('noData')}</p>
                  </td></tr>
                )}
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{isRTL && p.name_ar ? p.name_ar : p.name}</div>
                      {p.sku && <div className="text-xs text-gray-400">{p.sku}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.barcode ?? '-'}</td>
                    {isAdmin && <td className="px-4 py-3 text-end text-gray-600">{p.cost_price.toFixed(2)}</td>}
                    <td className="px-4 py-3 text-end font-semibold text-gray-800">{p.sale_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-end">
                      <span className={`font-medium ${p.stock_quantity <= p.low_stock_threshold ? 'text-orange-600' : 'text-gray-700'}`}>
                        {p.stock_quantity} {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{stockBadge(p)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setForm({ ...p }); setModal('edit'); }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                          <button onClick={() => setDeleteId(p.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal === 'add' ? t('addProduct') : t('editProduct')} onClose={() => setModal(null)} size="lg">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('productName')}</label>{F('name')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('productNameAr')}</label>{F('name_ar')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('sku')}</label>{F('sku')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('barcode')}</label>{F('barcode')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('costPrice')}</label>{F('cost_price', 'number')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('salePrice')}</label>{F('sale_price', 'number')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('stockQuantity')}</label>{F('stock_quantity', 'number')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('lowStockThreshold')}</label>{F('low_stock_threshold', 'number')}</div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('category')}</label>{F('category')}</div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('unit')}</label>
              <select value={form.unit ?? 'pcs'} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30">
                {['pcs', 'kg', 'g', 'L', 'mL', 'box', 'pack', 'm'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModal(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">{t('cancel')}</button>
            <button onClick={save} disabled={saving}
              className="px-5 py-2 bg-[#00A09D] text-white text-sm font-medium rounded-xl hover:bg-[#008f8c] disabled:opacity-60 transition-colors">
              {saving ? t('loading') : t('save')}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <Modal title={t('deleteProduct')} onClose={() => setDeleteId(null)} size="sm">
          <p className="text-sm text-gray-600 mb-5">{t('areYouSure')}</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
            <button onClick={() => remove(deleteId)}
              className="px-5 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600">{t('delete')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
