import { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, Layers } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { t, lang, setLang, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#714B67] via-[#5a3a52] to-[#3d2638]" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="relative w-full max-w-md mx-4">
        {/* Lang toggle */}
        <div className="absolute -top-12 end-0">
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="text-white/70 hover:text-white text-sm font-medium transition-colors bg-white/10 px-3 py-1.5 rounded-full"
          >
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#714B67] to-[#8a5d7e] px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
              <Layers className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-white">{t('loginTitle')}</h1>
            <p className="text-white/70 mt-1 text-sm">{t('loginSubtitle')}</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('email')}</label>
                <div className="relative">
                  <Mail className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} w-5 h-5 text-gray-400`} strokeWidth={1.5} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`w-full border border-gray-200 rounded-xl py-3 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 focus:border-[#714B67]`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('password')}</label>
                <div className="relative">
                  <Lock className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} w-5 h-5 text-gray-400`} strokeWidth={1.5} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`w-full border border-gray-200 rounded-xl py-3 ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 focus:border-[#714B67]`}
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} text-gray-400 hover:text-gray-600`}>
                    {showPass ? <EyeOff className="w-5 h-5" strokeWidth={1.5} /> : <Eye className="w-5 h-5" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00A09D] hover:bg-[#008f8c] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
              >
                {loading ? t('signingIn') : t('login')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
