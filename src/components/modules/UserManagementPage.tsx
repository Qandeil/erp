import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, UserCog, Key } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/logger';
import { Profile } from '../../lib/types';
import Modal from '../ui/Modal';

export default function UserManagementPage() {
  const { t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | 'password' | null>(null);
  const [form, setForm] = useState<Partial<Profile> & { password?: string }>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function addUser() {
    setSaving(true);
    setError('');
    // Create auth user via admin API (requires service role key) — using signUp for demo
    const { data, error: authErr } = await supabase.auth.admin.createUser({
      email: form.email!,
      password: form.password!,
      email_confirm: true,
    });
    if (authErr) {
      setError(authErr.message);
      setSaving(false);
      return;
    }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: form.full_name ?? '',
        role: form.role ?? 'staff',
        email: form.email ?? '',
        is_active: true,
      });
      logActivity(profile!.id, profile!.full_name, 'created', 'user', data.user.id, { name: form.full_name, role: form.role });
    }
    await load();
    setModal(null);
    setSaving(false);
  }

  async function updateUser() {
    setSaving(true);
    await supabase.from('profiles').update({
      full_name: form.full_name,
      role: form.role,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', form.id!);
    logActivity(profile!.id, profile!.full_name, 'updated', 'user', form.id, { name: form.full_name });
    await load();
    setModal(null);
    setSaving(false);
  }

  async function changePassword() {
    if (!form.id || !form.password) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase.auth.admin.updateUserById(form.id, { password: form.password });
    if (err) { setError(err.message); setSaving(false); return; }
    logActivity(profile!.id, profile!.full_name, 'password_changed', 'user', form.id);
    setModal(null);
    setSaving(false);
  }

  async function toggleActive(u: Profile) {
    await supabase.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id);
    logActivity(profile!.id, profile!.full_name, u.is_active ? 'deactivated' : 'activated', 'user', u.id);
    await load();
  }

  async function remove(id: string) {
    await supabase.auth.admin.deleteUser(id);
    await supabase.from('profiles').delete().eq('id', id);
    logActivity(profile!.id, profile!.full_name, 'deleted', 'user', id);
    setDeleteId(null);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 relative min-w-48">
          <Search className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`} strokeWidth={1.5} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
            className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none bg-white ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`} />
        </div>
        <button onClick={() => { setForm({ role: 'staff', is_active: true }); setError(''); setModal('add'); }}
          className="flex items-center gap-2 bg-[#00A09D] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#008f8c]">
          <Plus className="w-4 h-4" strokeWidth={1.5} />{t('addUser')}
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
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('fullName')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('email')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('role')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('status')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center">
                    <UserCog className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-gray-400">{t('noData')}</p>
                  </td></tr>
                )}
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#714B67]/10 rounded-lg flex items-center justify-center text-[#714B67] text-xs font-bold">
                          {u.full_name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-[#714B67]' : 'bg-teal-100 text-teal-700'}`}>
                        {t(u.role as 'admin' | 'staff')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(u)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${u.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {u.is_active ? t('active') : t('inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setForm({ ...u }); setError(''); setModal('edit'); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100">
                          <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        <button onClick={() => { setForm({ id: u.id, full_name: u.full_name, password: '' }); setError(''); setModal('password'); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-50 text-orange-400 hover:bg-orange-100">
                          <Key className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        {u.id !== profile?.id && (
                          <button onClick={() => setDeleteId(u.id)}
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

      {/* Add Modal */}
      {modal === 'add' && (
        <Modal title={t('addUser')} onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('fullName')}</label>
              <input value={form.full_name ?? ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('email')}</label>
              <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('password')}</label>
              <input type="password" value={form.password ?? ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('role')}</label>
              <div className="flex gap-3">
                {(['admin', 'staff'] as const).map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.role === r ? 'bg-[#714B67] text-white border-[#714B67]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {t(r)}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
            <button onClick={addUser} disabled={saving}
              className="px-5 py-2 bg-[#00A09D] text-white text-sm font-medium rounded-xl hover:bg-[#008f8c] disabled:opacity-60">
              {saving ? t('loading') : t('save')}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {modal === 'edit' && (
        <Modal title={t('editUser')} onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('fullName')}</label>
              <input value={form.full_name ?? ''} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('role')}</label>
              <div className="flex gap-3">
                {(['admin', 'staff'] as const).map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.role === r ? 'bg-[#714B67] text-white border-[#714B67]' : 'border-gray-200 text-gray-600'}`}>
                    {t(r)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
            <button onClick={updateUser} disabled={saving}
              className="px-5 py-2 bg-[#00A09D] text-white text-sm font-medium rounded-xl hover:bg-[#008f8c] disabled:opacity-60">
              {saving ? t('loading') : t('save')}
            </button>
          </div>
        </Modal>
      )}

      {/* Change Password */}
      {modal === 'password' && (
        <Modal title={`${t('password')} — ${form.full_name}`} onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('password')}</label>
              <input type="password" value={form.password ?? ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">{t('cancel')}</button>
            <button onClick={changePassword} disabled={saving}
              className="px-5 py-2 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 disabled:opacity-60">
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
