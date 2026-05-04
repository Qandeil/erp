import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Globe, Lock, User, Save } from 'lucide-react';

export default function SettingsPage() {
  const { t, lang, setLang } = useLanguage();
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function saveName() {
    setSaving(true); setMsg(''); setErr('');
    const { error } = await supabase.from('profiles').update({ full_name: name, updated_at: new Date().toISOString() }).eq('id', profile!.id);
    if (error) setErr(error.message);
    else setMsg(t('successSaved'));
    setSaving(false);
  }

  async function changePassword() {
    setSaving(true); setMsg(''); setErr('');
    // Re-authenticate then update
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: profile!.email, password: currentPass });
    if (signInErr) { setErr('Current password is incorrect'); setSaving(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) setErr(error.message);
    else { setMsg(t('successSaved')); setCurrentPass(''); setNewPass(''); }
    setSaving(false);
  }

  return (
    <div className="max-w-xl space-y-5">
      {/* Language */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-[#714B67]" strokeWidth={1.5} />
          <h2 className="font-semibold text-gray-800">{t('language')}</h2>
        </div>
        <div className="flex gap-3">
          {(['en', 'ar'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${lang === l ? 'bg-[#714B67] text-white border-[#714B67]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {l === 'en' ? t('english') : t('arabic')}
            </button>
          ))}
        </div>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-[#714B67]" strokeWidth={1.5} />
          <h2 className="font-semibold text-gray-800">{t('fullName')}</h2>
        </div>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 mb-4" />
        <button onClick={saveName} disabled={saving}
          className="flex items-center gap-2 bg-[#00A09D] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#008f8c] disabled:opacity-60">
          <Save className="w-4 h-4" strokeWidth={1.5} />{t('save')}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-[#714B67]" strokeWidth={1.5} />
          <h2 className="font-semibold text-gray-800">{t('password')}</h2>
        </div>
        <div className="space-y-3">
          <input type="password" placeholder="Current password" value={currentPass} onChange={e => setCurrentPass(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
          <input type="password" placeholder="New password" value={newPass} onChange={e => setNewPass(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30" />
        </div>
        <button onClick={changePassword} disabled={saving || !currentPass || !newPass}
          className="flex items-center gap-2 bg-[#714B67] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#8a5d7e] disabled:opacity-60 mt-4">
          <Save className="w-4 h-4" strokeWidth={1.5} />{t('save')}
        </button>
      </div>

      {msg && <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-xl text-sm">{msg}</div>}
      {err && <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl text-sm">{err}</div>}
    </div>
  );
}
