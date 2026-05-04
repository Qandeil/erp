import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import Layout, { PageKey } from './components/ui/Layout';
import LoginPage from './components/ui/LoginPage';
import HomePage from './components/modules/HomePage';
import DashboardPage from './components/modules/DashboardPage';
import InventoryPage from './components/modules/InventoryPage';
import SalesPage from './components/modules/SalesPage';
import ExpensesPage from './components/modules/ExpensesPage';
import CustomersPage from './components/modules/CustomersPage';
import UserManagementPage from './components/modules/UserManagementPage';
import ActivityLogsPage from './components/modules/ActivityLogsPage';
import PettyCashPage from './components/modules/PettyCashPage';
import SettingsPage from './components/modules/SettingsPage';

type FullPageKey = PageKey | 'home';

function InnerApp() {
  const { user, profile, loading, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [page, setPage] = useState<FullPageKey>('home');

  const adminOnly: FullPageKey[] = [
    'dashboard', 'customers', 'expenses',
    'userManagement', 'activityLogs', 'settings',
  ];

  function navigate(target: PageKey) {
    if (!isAdmin && adminOnly.includes(target)) return;
    setPage(target);
  }

  function breadcrumbs() {
    if (page === 'home') return [];
    return [{ label: t(page as any) }];
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) return <LoginPage />;

  function renderPage() {
    switch (page) {
      case 'home':           return <HomePage onNavigate={navigate} />;
      case 'dashboard':      return isAdmin ? <DashboardPage /> : <HomePage onNavigate={navigate} />;
      case 'inventory':      return <InventoryPage />;
      case 'sales':          return <SalesPage />;
      case 'expenses':       return isAdmin ? <ExpensesPage /> : <HomePage onNavigate={navigate} />;
      case 'customers':      return isAdmin ? <CustomersPage /> : <HomePage onNavigate={navigate} />;
      case 'userManagement': return isAdmin ? <UserManagementPage /> : <HomePage onNavigate={navigate} />;
      case 'activityLogs':   return isAdmin ? <ActivityLogsPage /> : <HomePage onNavigate={navigate} />;
      case 'pettyCash':      return <PettyCashPage />;
      case 'settings':       return isAdmin ? <SettingsPage /> : <HomePage onNavigate={navigate} />;
      default:               return <HomePage onNavigate={navigate} />;
    }
  }

  return (
    <Layout
      currentPage={page as PageKey}
      onNavigate={navigate}
      breadcrumbs={breadcrumbs()}
    >
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </LanguageProvider>
  );
}
