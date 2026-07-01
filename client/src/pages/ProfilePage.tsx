import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MapPin, ChevronRight, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { getAddresses } from '../lib/api';
import { useAddressStore } from '../stores/addressStore';
import { ProfilePageSkeleton } from '../components/Loading';
import type { Address } from '../../../shared/types';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setAddresses = useAddressStore((state) => state.setAddresses);
  const addresses = useAddressStore((state) => state.addresses);
  const [addressesLoading, setAddressesLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAddresses();
    } else {
      setAddressesLoading(false);
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      const data = await getAddresses();
      setAddresses(data);
    } catch (err) {
      console.error('Failed to load addresses:', err);
    } finally {
      setAddressesLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 首次进入（未登录或加载中）显示骨架屏
  if (!user || addressesLoading) {
    return <ProfilePageSkeleton />;
  }

  const defaultAddress = addresses.find((a: Address) => a.isDefault) || addresses[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-purple-50/30 to-blue-50/20">
      <header className="glass-card sticky top-0 z-10 px-4 py-4 stagger-fade-in" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/menu')} className="glass-card p-2 active:scale-95 transition-transform">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold gradient-text">个人中心</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="glass-card p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 stagger-fade-in" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xl font-bold">
              {user?.nickname?.[0] || user?.phone?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <p className="font-medium">{user?.nickname || '用户'}</p>
              <p className="text-sm text-muted-foreground">{user?.phone}</p>
            </div>
          </div>
        </div>

        <div className="glass-card overflow-hidden stagger-fade-in" style={{ animationDelay: '120ms' }}>
          <button
            onClick={() => navigate('/addresses')}
            className="w-full flex items-center gap-4 p-4 hover:bg-white/50 active:scale-[0.99] transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">收货地址</p>
              <p className="text-sm text-muted-foreground">
                {defaultAddress
                  ? `${defaultAddress.province || ''}${defaultAddress.city || ''}${defaultAddress.district || ''}${(defaultAddress.detail || '').slice(0, 10)}${(defaultAddress.detail || '').length > 10 ? '...' : ''}`
                  : '暂无地址'}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="border-t border-white/20" />

          <button
            onClick={() => navigate('/menu/orders')}
            className="w-full flex items-center gap-4 p-4 hover:bg-white/50 active:scale-[0.99] transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <User className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">我的订单</p>
              <p className="text-sm text-muted-foreground">查看所有订单记录</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full glass-card p-4 text-red-500 font-medium hover:bg-red-50/50 active:scale-[0.99] transition-all duration-200 stagger-fade-in flex items-center justify-center gap-2"
          style={{ animationDelay: '180ms' }}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </div>
  );
}
