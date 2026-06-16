import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BedDouble,
  CalendarDays,
  ClipboardList,
  Home,
  BarChart3,
  Users,
  Sparkles,
  Building2,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/stores', label: '门店管理', icon: Building2 },
  { path: '/rooms', label: '房间管理', icon: BedDouble },
  { path: '/calendar', label: '日历视图', icon: CalendarDays },
  { path: '/bookings', label: '预订管理', icon: ClipboardList },
  { path: '/cleaning-tasks', label: '保洁工单', icon: Sparkles },
  { path: '/guests', label: '客人档案', icon: Users },
  { path: '/reports', label: '经营报表', icon: BarChart3 },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-brand-cream">
      <aside className="w-60 bg-white border-r border-brand-brown/10 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-brand-brown/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-brown to-brand-brownLight flex items-center justify-center shadow-soft">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-brand-brown">民宿管家</h1>
              <p className="text-xs text-brand-taupe">Homestay Manager</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-brown text-white shadow-soft'
                    : 'text-brand-taupe hover:bg-brand-beige hover:text-brand-brown'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-brand-brown/10">
          <div className="text-xs text-brand-taupe/60 text-center">
            数据存储于本地浏览器
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-60">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
