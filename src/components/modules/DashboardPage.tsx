import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Package, Users, AlertTriangle,
  ShoppingCart, DollarSign, FileText, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { exportToExcel } from '../../lib/exportExcel';
import { Product, Customer, Sale, Expense } from '../../lib/types';

interface Stats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalProducts: number;
  lowStockCount: number;
  totalDebt: number;
  todaySales: number;
  recentSales: Sale[];
}

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.FC<any>;
  color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 ${color} rounded-2xl flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);

      const [{ data: sales }, { data: expenses }, { data: products }, { data: customers }] = await Promise.all([
        supabase.from('sales').select('*').eq('status', 'completed'),
        supabase.from('expenses').select('*'),
        supabase.from('products').select('*').eq('is_active', true),
        supabase.from('customers').select('*').eq('is_active', true),
      ]);

      const totalRevenue = (sales ?? []).reduce((s, x) => s + (x.total_amount - x.discount), 0);
      const totalExpenses = (expenses ?? []).reduce((s, x) => s + x.amount, 0);
      const todaySales = (sales ?? [])
        .filter(s => s.created_at.startsWith(today))
        .reduce((s, x) => s + x.total_amount, 0);
      const lowStockCount = (products ?? []).filter(p => p.stock_quantity <= p.low_stock_threshold).length;
      const totalDebt = (customers ?? []).reduce((s, c) => s + c.total_debt, 0);
      const recentSales = (sales ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

      setStats({
        totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses,
        totalProducts: (products ?? []).length, lowStockCount, totalDebt,
        todaySales, recentSales
      });
      setLoading(false);
    }
    load();
  }, []);

  async function handleExport() {
    const [{ data: products }, { data: customers }, { data: sales }, { data: expenses }] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('expenses').select('*'),
    ]);
    exportToExcel({
      products: products ?? [],
      customers: customers ?? [],
      sales: sales ?? [],
      expenses: expenses ?? [],
    });
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">{t('dashboard')}</h1>
        <button onClick={handleExport}
          className="flex items-center gap-2 bg-[#00A09D] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#008f8c] transition-colors">
          <Download className="w-4 h-4" strokeWidth={1.5} />
          {t('export')}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('totalRevenue')} value={fmt(stats!.totalRevenue)} icon={TrendingUp} color="bg-[#00A09D]" />
        <StatCard label={t('totalExpenses')} value={fmt(stats!.totalExpenses)} icon={TrendingDown} color="bg-red-400" />
        <StatCard label={t('netProfit')} value={fmt(stats!.netProfit)}
          icon={DollarSign} color={stats!.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'} />
        <StatCard label={t('todaySales')} value={fmt(stats!.todaySales)} icon={ShoppingCart} color="bg-blue-500" />
        <StatCard label={t('totalProducts')} value={String(stats!.totalProducts)} icon={Package} color="bg-violet-500" />
        <StatCard label={t('lowStockItems')} value={String(stats!.lowStockCount)} icon={AlertTriangle} color="bg-orange-400" />
        <StatCard label={t('pendingDebts')} value={fmt(stats!.totalDebt)} icon={Users} color="bg-[#714B67]" />
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#714B67]" strokeWidth={1.5} />
          <h2 className="font-semibold text-gray-800">{t('recentSales')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('invoiceNumber')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('customer')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('paymentType')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-gray-500 uppercase">{t('total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats!.recentSales.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">{t('noData')}</td></tr>
              )}
              {stats!.recentSales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{s.invoice_number}</td>
                  <td className="px-6 py-3 text-gray-800">{s.customer_name || '-'}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.payment_type === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {t(s.payment_type as 'paid' | 'postpaid')}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-end font-semibold text-gray-800">{fmt(s.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
