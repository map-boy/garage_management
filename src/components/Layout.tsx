import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Bell, Search } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Map paths to header titles
  const pageTitles: Record<string, string> = {
    '/': 'Management Dashboard',
    '/clients': 'Client Relations',
    '/vehicles': 'Vehicle Registry',
    '/jobs': 'Technical Workflow',
    '/stock': 'Inventory Control',
    '/invoices': 'Financial Ledger',
    '/reminders': 'Maintenance Alerts',
    '/reports': 'Performance Analytics',
    '/camera': 'Surveillance Hub',
    '/settings': 'System Control',
  };

  const title = pageTitles[location.pathname] || 'Management Portal';

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans text-gray-900">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0 transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 print-hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 hidden sm:block tracking-tight">{title}</h1>
          </div>

          <div className="flex items-center space-x-6">
            <div className="relative hidden md:block">
              <input 
                type="text" 
                placeholder="Search jobs, plates..." 
                className="bg-gray-100 border-none rounded-full py-1.5 px-4 text-sm w-64 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2" />
            </div>
            
            <div className="flex items-center space-x-2 border-l border-gray-100 pl-6">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
                JD
              </div>
              <span className="text-sm font-semibold hidden lg:block tracking-tight">John Doe</span>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="p-6 h-full overflow-y-auto flex-1 flex flex-col min-w-0">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col space-y-6">
            <Outlet />
            
            {/* FOOTER STATUS */}
            <footer className="flex flex-col sm:flex-row items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest pt-6 border-t border-gray-200 mt-auto mb-4 gap-4 print-hidden">
              <div className="flex items-center space-x-6 flex-wrap justify-center">
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> System Online</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Camera Feed Live</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span> Backup Synced</span>
              </div>
              <div className="font-mono">Build 2.4.0 (Offline Capable)</div>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
