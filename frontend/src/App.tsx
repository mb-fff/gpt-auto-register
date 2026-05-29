import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  RiDashboardLine,
  RiFingerprintLine,
  RiPulseLine,
  RiRobot2Line,
  RiSearch2Line,
  RiSettings4Line,
  RiShieldCheckLine,
  RiSparkling2Line,
  RiTerminalBoxLine,
} from '@remixicon/react';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import AccountDetail from './pages/AccountDetail';
import Tasks from './pages/Tasks';
import RealTimeMonitor from './pages/RealTimeMonitor';
import Diagnostics from './pages/Diagnostics';
import { Toaster } from './components/ui/sonner';
import { cn } from './lib/utils';

const navItems = [
  { path: '/', label: '系统总览', cnLabel: '总览', icon: RiDashboardLine },
  { path: '/accounts', label: '账号库', cnLabel: '账号库', icon: RiFingerprintLine },
  { path: '/tasks', label: '任务舱', cnLabel: '任务舱', icon: RiRobot2Line },
  { path: '/monitor', label: '活动流', cnLabel: '活动流', icon: RiTerminalBoxLine },
  { path: '/diagnostics', label: '系统诊断', cnLabel: '诊断', icon: RiSettings4Line },
];

function Shell() {
  const location = useLocation();
  const active = navItems.find(item => item.path === location.pathname) || navItems[0];

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 text-[#F5F7FF] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-[8%] top-[8%] size-72 rounded-full bg-[#6E7BFF]/20 blur-[100px]" />
        <div className="absolute right-[8%] top-[18%] size-80 rounded-full bg-[#9D7CFF]/16 blur-[110px]" />
        <div className="absolute bottom-[6%] left-[36%] size-96 rounded-full bg-cyan-300/8 blur-[130px]" />
      </div>

      <div className="relative mx-auto flex max-w-[1480px] gap-4 lg:gap-6">
        <aside className="glass-panel sticky top-4 hidden h-[calc(100vh-32px)] w-[92px] shrink-0 flex-col items-center rounded-[34px] px-3 py-4 lg:flex">
          <div className="mb-7 flex size-12 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.07] shadow-glow">
            <RiSparkling2Line className="text-[#cdd2ff]" />
          </div>
          <nav className="flex w-full flex-1 flex-col items-center gap-3">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = item.path === location.pathname;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'group flex w-full flex-col items-center gap-1 rounded-3xl px-2 py-3 text-white/42 transition-all duration-200 hover:bg-white/[0.07] hover:text-white',
                    isActive && 'bg-[#6E7BFF]/16 text-white shadow-[0_0_34px_rgba(110,123,255,0.18)]'
                  )}
                >
                  <Icon className="size-5" />
                  <span className="text-[10px] font-medium">{item.cnLabel}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex size-10 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
            <RiShieldCheckLine className="size-5" />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-6">
          <header className="glass-panel flex flex-col gap-4 rounded-[30px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-5">
            <div>
              <div className="text-xl font-normal text-white">{active.label}</div>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
              <div className="flex h-12 w-full max-w-xl items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.055] px-4 text-white/42 backdrop-blur-2xl transition-all focus-within:border-[#6E7BFF]/40 sm:w-[46vw]">
                <RiSearch2Line className="size-5 shrink-0" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/34"
                  placeholder="搜索账号、查看任务、输入指令..."
                />
                <span className="hidden rounded-xl border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] text-white/42 sm:inline">⌘ K</span>
              </div>
              <div className="hidden items-center gap-2 rounded-3xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white/60 md:flex">
                <RiPulseLine className="size-4 text-emerald-200" />
                在线
              </div>
            </div>

            <nav className="grid grid-cols-5 gap-2 lg:hidden">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = item.path === location.pathname;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center justify-center rounded-2xl border border-white/8 bg-white/[0.045] px-3 py-2 text-white/48',
                      isActive && 'border-[#6E7BFF]/30 bg-[#6E7BFF]/16 text-white'
                    )}
                  >
                    <Icon className="size-5" />
                  </Link>
                );
              })}
            </nav>
          </header>

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/monitor" element={<RealTimeMonitor />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
          </Routes>

        </main>
      </div>
      <Toaster />
    </div>
  );
}

const App: React.FC = () => {
  return (
    <Router>
      <Shell />
    </Router>
  );
};

export default App;
