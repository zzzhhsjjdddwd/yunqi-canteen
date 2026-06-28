import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  LogOut,
  Menu,
  Cloud,
  Leaf,
  Mountain,
  ChevronRight,
  ChevronDown,
  Wallet,
  Receipt,
  BarChart3,
  FileText,
} from 'lucide-react';
import { useAdminStore } from '../stores/adminStore';

const navItems = [
  { path: '/', label: '概览', icon: LayoutDashboard },
  { path: '/orders', label: '订单管理', icon: ShoppingCart },
  { path: '/products', label: '商品管理', icon: Package },
  { path: '/users', label: '用户管理', icon: Users },
];

const financeSubMenu = [
  { path: '/finance', label: '财务概览', icon: Wallet },
  { path: '/finance/transactions', label: '收支明细', icon: Receipt },
  { path: '/finance/report', label: '财务报表', icon: BarChart3 },
  { path: '/finance/invoices', label: '账单管理', icon: FileText },
];

const allNavItems = [
  ...navItems,
  { path: '/finance', label: '财务管理', icon: BarChart3, isGroup: true },
  { path: '/settings', label: '系统设置', icon: Settings },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [financeExpanded, setFinanceExpanded] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminStore();

  const isFinancePage = location.pathname.startsWith('/finance');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    for (const item of allNavItems) {
      if ((item as any).isGroup) {
        const subItem = financeSubMenu.find(s => s.path === location.pathname);
        if (subItem) return subItem.label;
      } else if (location.pathname === item.path) {
        return item.label;
      }
    }
    return '概览';
  };

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-accent/3" />
        <div className="bg-blob-1 -top-20 -right-20" />
        <div className="bg-blob-2 top-1/2 -left-10" />
      </div>

      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 sidebar-glass transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-white/60">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30" />
              <div className="relative flex flex-col items-center">
                <Cloud className="h-4 w-4 text-white" strokeWidth={2} />
                <div className="flex items-center gap-px -mt-0.5">
                  <Mountain className="h-2.5 w-2.5 text-white/80" strokeWidth={2} />
                  <Leaf className="h-2.5 w-2.5 text-white/80" strokeWidth={2} />
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text-gold tracking-wide">云栖浅食</h1>
              <p className="text-xs text-muted-foreground">商家后台</p>
            </div>
          </div>

          {/* 导航 */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'nav-item-active shadow-md'
                      : 'nav-item-hover text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 ml-auto opacity-60" />
                  )}
                </button>
              );
            })}

            {/* 财务管理 - 可展开 */}
            <div>
              <button
                onClick={() => setFinanceExpanded(!financeExpanded)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isFinancePage
                    ? 'nav-item-active shadow-md'
                    : 'nav-item-hover text-muted-foreground hover:text-foreground'
                }`}
              >
                <BarChart3 className="h-5 w-5" />
                <span>财务管理</span>
                {financeExpanded ? (
                  <ChevronDown className="h-4 w-4 ml-auto opacity-60" />
                ) : (
                  <ChevronRight className="h-4 w-4 ml-auto opacity-60" />
                )}
              </button>
              {financeExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {financeSubMenu.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-primary/15 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/30'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 设置 */}
            <button
              onClick={() => {
                navigate('/settings');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                location.pathname === '/settings'
                  ? 'nav-item-active shadow-md'
                  : 'nav-item-hover text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span>系统设置</span>
              {location.pathname === '/settings' && (
                <ChevronRight className="h-4 w-4 ml-auto opacity-60" />
              )}
            </button>
          </nav>

          {/* 底部 */}
          <div className="border-t border-white/60 p-4 space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold shadow-md">
                {admin?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{admin?.username || '管理员'}</p>
                <p className="text-xs text-muted-foreground">管理员</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive rounded-xl hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="sticky top-0 z-30 top-nav-glass">
          <div className="flex items-center justify-between px-4 lg:px-8 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/50 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold gradient-text">
                {getPageTitle()}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shadow-md">
                {admin?.username?.[0]?.toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
