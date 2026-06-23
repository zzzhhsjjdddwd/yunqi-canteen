import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Settings,
  LogOut,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAdminStore } from '../stores/adminStore';
import { joinAdminRoom } from '../lib/socket';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/orders', icon: ShoppingBag, label: '订单管理' },
  { to: '/products', icon: UtensilsCrossed, label: '商品管理' },
  { to: '/users', icon: Users, label: '用户管理' },
  { to: '/settings', icon: Settings, label: '设置' },
];

export default function Layout() {
  const { admin, logout } = useAdminStore();
  const navigate = useNavigate();

  useEffect(() => {
    joinAdminRoom();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* 背景装饰 */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-40 w-40 rounded-full bg-primary-light/15 blur-2xl" />
      </div>

      {/* Sidebar */}
      <aside className="hidden w-64 flex-col sidebar-glass lg:flex">
        <div className="border-b border-white/30 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">云栖浅食</h1>
              <p className="text-xs text-muted-foreground">管理后台</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'nav-item-active'
                    : 'text-muted-foreground hover:text-foreground nav-item-hover'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/30 p-4">
          <div className="glass-card mb-3 flex items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-light text-white font-bold shadow-lg shadow-primary/30">
              {admin?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <p className="text-sm font-medium">{admin?.username}</p>
              <p className="text-xs text-muted-foreground">管理员</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive transition-all hover:bg-destructive/10 hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogOut className="h-5 w-5" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-white/30 bg-white/80 backdrop-blur-md px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h1 className="font-bold gradient-text">云栖浅食</h1>
          </div>
          <button onClick={handleLogout} className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-all hover:bg-destructive/20">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Mobile nav */}
        <nav className="flex border-b border-white/30 bg-white/80 backdrop-blur-md lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-all',
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}