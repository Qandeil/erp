import { useEffect, useState } from 'react';
import { Search, Activity, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { ActivityLog } from '../../lib/types';

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
  payment: 'bg-orange-100 text-orange-700',
  opened: 'bg-teal-100 text-teal-700',
  settled: 'bg-purple-100 text-purple-700',
  activated: 'bg-green-100 text-green-700',
  deactivated: 'bg-gray-100 text-gray-600',
  password_changed: 'bg-yellow-100 text-yellow-700',
};

export default function ActivityLogsPage() {
  const { t, isRTL } = useLanguage();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setLogs(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l =>
    l.user_name.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative min-w-48">
          <Search className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`} strokeWidth={1.5} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
            className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 bg-white ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`} />
        </div>
        <button onClick={load} className="flex items-center gap-2 border border-gray-200 bg-white text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
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
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('timestamp')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('user')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('action')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('entityType')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center">
                    <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-gray-400">{t('noData')}</p>
                  </td></tr>
                )}
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#714B67]/10 rounded-md flex items-center justify-center text-[#714B67] text-xs font-bold">
                          {log.user_name[0]?.toUpperCase()}
                        </div>
                        <span className="text-gray-700 font-medium text-xs">{log.user_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{log.entity_type}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono max-w-xs truncate">
                      {Object.entries(log.details ?? {}).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
