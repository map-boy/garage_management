import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Wrench, 
  Package, 
  FileText, 
  Bell, 
  BarChart3, 
  Camera, 
  Settings,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  onClose?: () => void;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/vehicles', label: 'Vehicles', icon: Car },
  { path: '/jobs', label: 'Job Cards', icon: Wrench },
  { path: '/stock', label: 'Inventory', icon: Package },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/reminders', label: 'Reminders', icon: Bell },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/camera', label: 'Live Camera', icon: Camera },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="w-64 bg-gray-900 flex-shrink-0 flex flex-col h-full overflow-y-auto">
      <div className="p-6 border-b border-gray-800 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl">G</div>
            <span className="text-white font-semibold tracking-tight text-lg">GaragePro GMS</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 py-4 text-gray-400 text-sm">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "px-6 py-2.5 transition-colors cursor-pointer flex items-center space-x-3",
                isActive 
                  ? "bg-gray-800 text-white" 
                  : "hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-gray-800">
        <div className="p-3 bg-gray-800 rounded-lg text-[10px]">
          <div className="text-gray-500 mb-1.5 uppercase font-bold tracking-wider">Storage Usage</div>
          <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: '12%' }}></div>
          </div>
          <div className="text-gray-400 mt-2 font-mono flex justify-between">
            <span>1.2 MB</span>
            <span>10.0 MB</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
