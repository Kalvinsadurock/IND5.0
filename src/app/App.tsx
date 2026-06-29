import React, { useState, lazy, Suspense } from 'react';
import * as Icons from '../shared/ui/icons';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { GlobalSearch } from './components/GlobalSearch';
import { NotificationBell } from './components/NotificationBell';
import { Button } from '../shared/ui/button';
import { useAuth } from '../lib/AuthContext';

// Eagerly load critical components
import { DashboardView } from './components/DashboardView';

// Lazy load tab components for code splitting
const OperationsTab = lazy(() => import('./components/OperationsTab').then(m => ({ default: (m as any).OperationsTab || (m as any).default || m })));
const QualityTab = lazy(() => import('./components/QualityTab').then(m => ({ default: (m as any).QualityTab || (m as any).default || m })));
const SupplyTab = lazy(() => import('./components/SupplyTab').then(m => ({ default: (m as any).SupplyTab || (m as any).default || m })));
const ProcessTab = lazy(() => import('./components/ProcessTab'));
const PreparationDashboard = lazy(() => import('./components/PreparationDashboard').then(m => ({ default: (m as any).PreparationDashboard || (m as any).default || m })));
const IncomingPage = lazy(() => import('./components/IncomingPage').then(m => ({ default: (m as any).IncomingPage || (m as any).default || m })));
const OeeModule = lazy(() => import('./components/oee/OeeModule'));
const ICTModule = lazy(() => import('./components/ICTModule'));
const PlatformCoreModule = lazy(() => import('./components/PlatformCoreModule'));
const ConfigurationStudioModule = lazy(() => import('./components/ConfigurationStudioModule'));

// Loading fallback component
function TabLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-slate-400">Loading...</div>
    </div>
  );
}

export default function App() {
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => { }} />;
  }

  const handleNavigateToProcess = (processId: number, partId?: number) => {
    setSelectedProcessId(processId);
    setSelectedPartId(partId || null);
    setActiveView('process');
  };

  const handleLogout = () => {
    logout();
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView onNavigateToProcess={handleNavigateToProcess} />;
      case 'inventory':
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <IncomingPage />
          </Suspense>
        );
      case 'preparation':
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <PreparationDashboard />
          </Suspense>
        );
      case 'operations':
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <OperationsTab />
          </Suspense>
        );
      case 'process':
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <ProcessTab initialProcessId={selectedProcessId} initialPartId={selectedPartId} />
          </Suspense>
        );
      case 'quality':
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <QualityTab />
          </Suspense>
        );
      case 'supply':
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <SupplyTab />
          </Suspense>
        );
      case 'oee':
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <OeeModule />
          </Suspense>
        );
      case 'ict':
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <ICTModule />
          </Suspense>
        );
      case 'platform':
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <PlatformCoreModule />
          </Suspense>
        );
      case 'configuration':
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <ConfigurationStudioModule />
          </Suspense>
        );
      default:
        return <DashboardView onNavigateToProcess={handleNavigateToProcess} />;
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-900 flex overflow-hidden">
      <div className="w-64 flex-shrink-0">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white capitalize">{activeView}</h2>
            <div className="flex items-center gap-4">
              {/* User Info */}
              {user && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-700 border border-slate-600">
                  <Icons.User className="h-4 w-4 text-emerald-400" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-100">{user.employeeName}</span>
                    <span className="text-xs text-slate-400">{user.role}</span>
                  </div>
                </div>
              )}

              <NotificationBell />

              <Button
                onClick={() => setShowGlobalSearch(true)}
                variant="outline"
                className="bg-emerald-700 border-emerald-600 hover:bg-emerald-600 text-white"
              >
                <Icons.Search className="mr-2 h-4 w-4" />
                Search Parts
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-100"
              >
                <Icons.LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-900">
          <div className="max-w-7xl mx-auto h-full">
            {renderContent()}
          </div>
        </main>
      </div>

      {showGlobalSearch && (
        <GlobalSearch onClose={() => setShowGlobalSearch(false)} />
      )}
    </div>
  );
}
