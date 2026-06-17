import { useState } from 'react';
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
  FileText,
  ChevronDown,
  User as UserIcon,
  Shield,
  Crown,
  ListTodo,
  FileSignature,
  Tag,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Permission } from '@/types';
import { UserRoleLabels } from '@/types';

interface NavItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}

const allNavItems: NavItem[] = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/stores', label: '门店管理', icon: Building2, permission: 'store:view' },
  { path: '/rooms', label: '房间管理', icon: BedDouble, permission: 'room:view' },
  { path: '/calendar', label: '日历视图', icon: CalendarDays, permission: 'booking:view' },
  { path: '/holiday-pricing', label: '节假日调价', icon: Tag, permission: 'holidaypricing:view' },
  { path: '/bookings', label: '预订管理', icon: ClipboardList, permission: 'booking:view' },
  { path: '/long-term', label: '长租管理', icon: FileSignature, permission: 'longterm:view' },
  { path: '/waitlist', label: '候补队列', icon: ListTodo, permission: 'waitlist:view' },
  { path: '/cleaning-tasks', label: '保洁工单', icon: Sparkles, permission: 'cleaning:view' },
  { path: '/guests', label: '客人档案', icon: Users, permission: 'guest:view' },
  { path: '/reports', label: '经营报表', icon: BarChart3, permission: 'report:view' },
  { path: '/audit-logs', label: '操作审计', icon: FileText, permission: 'audit:view' },
];

export default function Layout() {
  const location = useLocation();
  const { currentUser, users, hasPermission, switchUser } = useAppStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = allNavItems.filter((item) =>
    item.permission ? hasPermission(item.permission) : true
  );

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

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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

        <div className="border-t border-brand-brown/10 p-4">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-brand-beige transition-colors"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                currentUser.role === 'owner'
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                  : 'bg-gradient-to-br from-blue-400 to-blue-600'
              }`}>
                {currentUser.role === 'owner' ? (
                  <Crown className="w-4 h-4 text-white" />
                ) : (
                  <UserIcon className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-brand-brown">
                  {currentUser.name}
                </div>
                <div className="text-xs text-brand-taupe flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {UserRoleLabels[currentUser.role]}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-brand-taupe transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-brand-brown/10 overflow-hidden">
                <div className="p-2 space-y-1">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        if (hasPermission('user:switch') || user.id === currentUser.id) {
                          switchUser(user.id);
                        }
                        setUserMenuOpen(false);
                      }}
                      disabled={!hasPermission('user:switch') && user.id !== currentUser.id}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        user.id === currentUser.id
                          ? 'bg-brand-beige text-brand-brown'
                          : hasPermission('user:switch')
                          ? 'hover:bg-brand-beige/50 text-brand-taupe hover:text-brand-brown'
                          : 'opacity-40 cursor-not-allowed text-brand-taupe'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        user.role === 'owner'
                          ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                          : 'bg-gradient-to-br from-blue-400 to-blue-600'
                      }`}>
                        {user.role === 'owner' ? (
                          <Crown className="w-3 h-3 text-white" />
                        ) : (
                          <UserIcon className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs opacity-70">{UserRoleLabels[user.role]}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {!hasPermission('user:switch') && (
                  <div className="px-3 py-2 bg-brand-cream border-t border-brand-brown/5">
                    <p className="text-xs text-brand-taupe">仅老板可切换角色</p>
                  </div>
                )}
              </div>
            )}
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
