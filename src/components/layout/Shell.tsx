import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  Package,
  Users,
  FileText,
  Bell,
  BarChart3,
  Camera,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'vehicles', label: 'Vehicles', icon: Car, path: '/vehicles' },
  { id: 'jobs', label: 'Job Cards', icon: ClipboardList, path: '/jobs' },
  { id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory' },
  { id: 'customers', label: 'Customers', icon: Users, path: '/customers' },
  { id: 'invoices', label: 'Invoices', icon: FileText, path: '/invoices' },
  { id: 'reminders', label: 'Reminders', icon: Bell, path: '/reminders' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
  { id: 'monitoring', label: 'CCTV Monitoring', icon: Camera, path: '/monitoring' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const currentLabel = menuItems.find(i => isActive(i.path))?.label || 'Overview';

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="relative flex flex-col h-full bg-white border-r border-slate-200 z-20 print:hidden"
      >
        <div className="flex items-center gap-3 p-6 mb-8">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-xl italic text-white shadow-lg">
            GM
          </div>
          {isSidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-xl tracking-tight text-slate-900"
            >
              GARAGE MANAGEMENT<span className="text-orange-500"> PRO</span>
            </motion.span>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group relative",
                isActive(item.path)
                  ? "bg-orange-50 text-orange-600 shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive(item.path) ? "text-orange-500" : "text-slate-400 group-hover:text-slate-600")} />
              {isSidebarOpen && <span className="font-semibold">{item.label}</span>}
              {isActive(item.path) && (
                <motion.div
                  layoutId="active-bar"
                  className="absolute left-0 w-1 h-6 bg-orange-500 rounded-r-auto"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-200 space-y-4">
          {isSidebarOpen && (
            <div className="flex items-center gap-3 px-2 py-3 bg-slate-50 rounded-2xl overflow-hidden mr-2 ml-2 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 flex-shrink-0 shadow-sm border-2 border-white" />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold truncate text-sm text-slate-900">{profile?.displayName || 'Garage Owner'}</span>
                <span className="text-[10px] text-slate-400 truncate uppercase font-bold tracking-widest">{profile?.role?.replace('_', ' ') || 'staff'}</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-4 top-10 w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-200 hover:scale-110 hover:border-orange-500 transition-all shadow-md z-30"
        >
          {isSidebarOpen ? <X className="w-4 h-4 text-slate-400" /> : <Menu className="w-4 h-4 text-slate-400" />}
        </button>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar bg-white">
        <header className="sticky top-0 w-full h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10 flex items-center justify-between px-8 print:hidden">
          <div className="flex flex-col">
            <h1 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {currentLabel}
            </h1>
            <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <span>Main Console</span>
            </div>
          </div>
        </header>

        <section className="p-8 pb-32">
          {children}
        </section>
      </main>
    </div>
  );
}