import { useNavigate, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { ClipboardList, Cloud, Leaf, Mountain } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import InstallPrompt from './InstallPrompt';
import FloatingCart from './FloatingCart';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user } = useAuthStore();

  const showFloatingCart = !(
    location.pathname.startsWith('/menu/orders') ||
    location.pathname.startsWith('/menu/checkout')
  );

  return (
    <div className="flex min-h-screen flex-col relative">
      {/* 动态背景装饰 */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-accent/3" />
        <div className="bg-blob-1 -top-20 -right-20" />
        <div className="bg-blob-2 top-1/3 -left-10" />
        <div className="bg-blob-3 bottom-20 right-10" />
      </div>

      {/* 顶部导航 · 青金奢华 */}
      <header className="sticky top-0 z-40 top-nav-glass">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            {/* Logo 徽章 */}
            <div className="relative flex h-9 w-9 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30" />
              <div className="relative flex flex-col items-center">
                <Cloud className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                <div className="flex items-center gap-px -mt-0.5">
                  <Mountain className="h-2 w-2 text-white/80" strokeWidth={2} />
                  <Leaf className="h-2 w-2 text-white/80" strokeWidth={2} />
                </div>
              </div>
            </div>
            <h1 className="text-lg font-bold gradient-text-gold tracking-wide">云栖浅食</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/menu/orders')}
              className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur-sm transition-all hover:bg-white/70 hover:text-primary border border-white/40"
            >
              <ClipboardList className="h-4 w-4" />
              <span>订单</span>
            </button>
            {isLoggedIn ? (
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur-sm transition-all hover:bg-white/70 hover:text-primary border border-white/40"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {user?.nickname?.[0] || user?.phone?.[0] || 'U'}
                </div>
                <span className="hidden sm:inline">{user?.nickname || '我的'}</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur-sm transition-all hover:bg-white/70 hover:text-primary border border-white/40"
              >
                <span>登录</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 pb-32">
        <Outlet />
      </main>

      {/* 悬浮购物车 */}
      {showFloatingCart && <FloatingCart />}

      {/* PWA 安装提示 */}
      <InstallPrompt />
    </div>
  );
}
