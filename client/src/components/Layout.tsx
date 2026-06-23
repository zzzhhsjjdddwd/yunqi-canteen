import { useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { ShoppingBag, ClipboardList, Sparkles, User } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { formatPrice } from '../lib/utils';
import CartSheet from './CartSheet';
import InstallPrompt from './InstallPrompt';

export default function Layout() {
  const navigate = useNavigate();
  const { getTotal, getCount } = useCartStore();
  const { isLoggedIn, user } = useAuthStore();
  const cartCount = getCount();
  const cartTotal = getTotal();

  return (
    <div className="flex min-h-screen flex-col">
      {/* 背景装饰 */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-60 w-60 rounded-full bg-accent/12 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-40 w-40 rounded-full bg-primary-light/15 blur-2xl" />
      </div>

      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 top-nav-glass">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold gradient-text">云栖浅食</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur-sm transition-all hover:bg-white/70 hover:text-primary"
            >
              <ClipboardList className="h-4 w-4" />
              <span>订单</span>
            </button>
            {isLoggedIn ? (
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur-sm transition-all hover:bg-white/70 hover:text-primary"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
                  {user?.nickname?.[0] || user?.phone?.[0] || 'U'}
                </div>
                <span className="hidden sm:inline">{user?.nickname || '我的'}</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur-sm transition-all hover:bg-white/70 hover:text-primary"
              >
                <User className="h-4 w-4" />
                <span>登录</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* 底部购物车栏 */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-glass border-t border-white/50 p-4">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <CartSheet>
              <button className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-primary to-primary-light px-5 py-3 text-white shadow-xl shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <ShoppingBag className="h-5 w-5" />
                <span className="relative font-medium">购物车</span>
                <span className="relative ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 text-xs font-bold backdrop-blur-sm">
                  {cartCount}
                </span>
              </button>
            </CartSheet>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">合计</p>
                <p className="text-xl font-bold gradient-text">{formatPrice(cartTotal)}</p>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-accent to-accent-light px-5 py-3 font-medium text-white shadow-xl shadow-accent/25 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-accent/30 active:scale-[0.98]"
              >
                <span className="relative z-10">去结算</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA 安装提示 */}
      <InstallPrompt />
    </div>
  );
}
