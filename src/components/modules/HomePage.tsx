import {
  LayoutDashboard, Package, ShoppingCart, Receipt,
  Users, UserCog, Activity, Settings, Wallet
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { PageKey } from '../ui/Layout';

interface AppTile {
  key: PageKey;
  icon: React.FC<{ className?: string; strokeWidth?: number }>;
  labelKey: string;
  color: string;
  bg: string;
  adminOnly?: boolean;
}

const TILES: AppTile[] = [
  { key: 'sales',          icon: ShoppingCart,    labelKey: 'sales',          color: 'text-teal-600',   bg: 'bg-teal-50' },
  { key: 'inventory',      icon: Package,         labelKey: 'inventory',      color: 'text-blue-600',   bg: 'bg-blue-50' },
  { key: 'pettyCash',      icon: Wallet,          labelKey: 'pettyCash',      color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'customers',      icon: Users,           labelKey: 'customers',      color: 'text-purple-600', bg: 'bg-purple-50',  adminOnly: true },
  { key: 'expenses',       icon: Receipt,         labelKey: 'expenses',       color: 'text-red-500',    bg: 'bg-red-50',     adminOnly: true },
  { key: 'dashboard',      icon: LayoutDashboard, labelKey: 'dashboard',      color: 'text-indigo-600', bg: 'bg-indigo-50',  adminOnly: true },
  { key: 'userManagement', icon: UserCog,         labelKey: 'userManagement', color: 'text-[#714B67]',  bg: 'bg-purple-50',  adminOnly: true },
  { key: 'activityLogs',   icon: Activity,        labelKey: 'activityLogs',   color: 'text-gray-600',   bg: 'bg-gray-100',   adminOnly: true },
  { key: 'settings',       icon: Settings,        labelKey: 'settings',       color: 'text-gray-500',   bg: 'bg-gray-100',   adminOnly: true },
];

interface HomeProps {
  onNavigate: (page: PageKey) => void;
}

export default function HomePage({ onNavigate }: HomeProps) {
  const { profile, isAdmin } = useAuth();
  const { t } = useLanguage();

  const visibleTiles = TILES.filter(tile => !tile.adminOnly || isAdmin);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return '🌅';
    if (h < 17) return '☀️';
    return '🌙';
  };

  return (
    <div className="min-h-full">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#714B67] to-[#8a5d7e] rounded-2xl px-8 py-8 mb-8 text-white">
        <p className="text-white/70 text-sm">{greeting()} {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <h1 className="text-2xl font-bold mt-1">
          {isAdmin ? '👋 ' : ''}{profile?.full_name}
        </h1>
        <p className="text-white/60 text-sm mt-1 capitalize">{profile?.role} · ERP Pro</p>
      </div>

      {/* App grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {visibleTiles.map(tile => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.key}
              onClick={() => onNavigate(tile.key)}
              className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all group"
            >
              <div className={`w-14 h-14 ${tile.bg} rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform`}>
                <Icon className={`w-7 h-7 ${tile.color}`} strokeWidth={1.5} />
              </div>
              <span className="text-xs font-semibold text-gray-600 text-center leading-tight">
                {t(tile.labelKey as any)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
