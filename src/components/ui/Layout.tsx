import { useState, ReactNode } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, Users, UserCog,
  Activity, Settings, LogOut, ChevronLeft, ChevronRight, Globe,
  Wallet, Menu, X, Layers
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { TranslationKey } from '../../lib/translations';

export type PageKey =
  | 'dashboard' | 'inventory' | 'sales' | 'expenses'
  | 'customers' | 'userManagement' | 'activityLogs'
  | 'settings' | 'pettyCash';

interface NavItem {
  key: PageKey;
  icon: React.FC<{ className?: string; strokeWidth?: number }>;
  labelKey: TranslationKey;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard',      icon: LayoutDashboard, labelKey: 'dashboard',      adminOnly: true },
  { key: 'sales',          icon: ShoppingCart,    labelKey: 'sales' },
  { key: 'inventory',      icon: Package,         labelKey: 'inventory' },
  { key: 'pettyCash',      icon: Wallet,          labelKey: 'pettyCash' },
  { key: 'customers',      icon: Users,           labelKey: 'customers',      adminOnly: true },
  { key: 'expenses',       icon: Receipt,         labelKey: 'expenses',       adminOnly: true },
  { key: 'userManagement', icon: UserCog,         labelKey: 'userManagement', adminOnly: true },
  { key: 'activityLogs',   icon: Activity,        labelKey: 'activityLogs',   adminOnly: true },
  { key: 'settings',       icon: Settings,        labelKey: 'settings',       adminOnly: true },
];

interface LayoutProps {
  children: ReactNode;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  breadcrumbs?: { label: string; page?: PageKey }[];
}

export default function Layout({ children, currentPage, onNavigate, breadcrumbs }: LayoutProps) {
  const { profile, isAdmin, signOut } = useAuth();
  const { t, lang, setLang, isRTL } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(i => !i.adminOnly || isAdmin);

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          {!collapsed && <span className="text-white font-bold text-lg tracking-tight">ERP Pro</span>}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
                title={collapsed ? t(item.labelKey) : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? 'bg-white text-[#714B67] shadow-sm'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'}
                  ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                {!collapsed && <span>{t(item.labelKey)}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3 space-y-1">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/75 hover:bg-white/10 hover:text-white text-sm transition-all ${collapsed ? 'justify-center' : ''}`}
          >
            <Globe className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
            {!collapsed && <span>{lang === 'en' ? 'العربية' : 'English'}</span>}
          </button>

          {/* User + logout */}
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{profile?.full_name}</p>
                <p className="text-white/50 text-xs capitalize">{profile?.role}</p>
              </div>
              <button onClick={signOut} className="text-white/50 hover:text-white transition-colors">
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}
          {collapsed && (
            <button onClick={signOut}
              className="w-full flex items-center justify-center px-3 py-2.5 rounded-xl text-white/75 hover:bg-white/10 hover:text-white transition-all">
              <LogOut className="w-5 h-5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-[#714B67] transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0`}>
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`absolute top-1/2 ${isRTL ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'} bg-[#714B67] border border-purple-300/30 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-[#8a5d7e] transition-colors z-10`}
          style={{ position: 'fixed', marginTop: '-12px', [isRTL ? 'left' : 'right']: collapsed ? '52px' : '228px' }}
        >
          {isRTL
            ? (collapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)
            : (collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />)}
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className={`relative z-50 w-64 bg-[#714B67] h-full ${isRTL ? 'ms-auto' : ''}`}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-gray-500 hover:text-gray-700">
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-sm flex-1">
            <span className="text-gray-400 font-medium">ERP</span>
            {breadcrumbs?.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-gray-300">/</span>
                {crumb.page ? (
                  <button onClick={() => onNavigate(crumb.page!)}
                    className="text-gray-500 hover:text-[#714B67] transition-colors">
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-[#714B67] font-semibold">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          {/* Right side: user badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isAdmin ? 'bg-purple-100 text-[#714B67]' : 'bg-teal-100 text-teal-700'}`}>
              {isAdmin ? t('admin') : t('staff')}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
