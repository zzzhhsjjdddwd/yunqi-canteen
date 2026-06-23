import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Volume2, VolumeX, ShoppingBag, TrendingUp, Package, Sparkles, UtensilsCrossed } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { EmptyState, DashboardPageSkeleton } from '../components/Loading';
import { getStats, getOrders } from '../lib/api';
import { onNewOrder } from '../lib/socket';
import { useSpeaker } from '../hooks/useSpeaker';
import { formatPrice, formatDate } from '../lib/utils';
import type { StatsData, Order } from '../../../shared/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { speakNewOrder, speakerEnabled, setSpeakerEnabled } = useSpeaker();

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, ordersData] = await Promise.all([
          getStats(),
          getOrders(),
        ]);
        setStats(statsData);
        setRecentOrders(ordersData.slice(0, 10));
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    const unsubscribe = onNewOrder((data) => {
      const newOrder: Order = {
        id: data.orderId,
        orderNo: data.orderNo,
        items: data.items,
        total: data.total,
        status: 'pending',
        paymentStatus: 'unpaid',
        remark: data.remark,
        createdAt: data.createdAt,
        updatedAt: data.createdAt,
      };
      setRecentOrders((prev) => [newOrder, ...prev.slice(0, 9)]);
      setStats((prev) =>
        prev ? { ...prev, todayOrders: prev.todayOrders + 1, pendingOrders: prev.pendingOrders + 1 } : prev
      );

      if (speakerEnabled) {
        speakNewOrder();
      }
    });

    return () => unsubscribe();
  }, [speakerEnabled, speakNewOrder]);

  if (loading) {
    return <DashboardPageSkeleton />;
  }

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'unpaid' && status === 'pending') {
      return <span className="status-badge status-badge-pending">待支付</span>;
    }
    const configs: Record<string, { class: string; label: string }> = {
      paid: { class: 'status-badge-ready', label: '已支付' },
      preparing: { class: 'status-badge-preparing', label: '制作中' },
      completed: { class: 'status-badge-completed', label: '已完成' },
      cancelled: { class: 'status-badge-cancelled', label: '已取消' },
    };
    const config = configs[status] || { class: 'status-badge-pending', label: status };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between stagger-fade-in" style={{ animationDelay: '0ms' }}>
        <div>
          <h1 className="text-2xl font-bold gradient-text">仪表盘</h1>
          <p className="text-sm text-muted-foreground mt-1">实时查看店铺运营数据</p>
        </div>
        <div className="glass-card flex items-center gap-3 px-4 py-2">
          {speakerEnabled ? (
            <Volume2 className="h-5 w-5 text-primary" />
          ) : (
            <VolumeX className="h-5 w-5 text-muted-foreground" />
          )}
          <Switch checked={speakerEnabled} onCheckedChange={setSpeakerEnabled} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 stagger-fade-in" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-4">
            <div className="icon-container icon-container-primary h-14 w-14">
              <ShoppingBag className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">今日订单</p>
              <p className="text-3xl font-bold gradient-text">{stats?.todayOrders || 0}</p>
            </div>
          </div>
        </div>

        <div className="stat-card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 stagger-fade-in" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-4">
            <div className="icon-container icon-container-success h-14 w-14">
              <TrendingUp className="h-7 w-7 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">今日营业额</p>
              <p className="text-3xl font-bold gradient-text">{formatPrice(stats?.todayRevenue || 0)}</p>
            </div>
          </div>
        </div>

        <div className="stat-card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 stagger-fade-in" style={{ animationDelay: '180ms' }}>
          <div className="flex items-center gap-4">
            <div className="icon-container icon-container-warning h-14 w-14">
              <Clock className="h-7 w-7 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">待处理</p>
              <p className="text-3xl font-bold gradient-text">{stats?.pendingOrders || 0}</p>
            </div>
          </div>
        </div>

        <div className="stat-card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 stagger-fade-in" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center gap-4">
            <div className="icon-container icon-container-accent h-14 w-14">
              <Package className="h-7 w-7 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">总订单数</p>
              <p className="text-3xl font-bold gradient-text">{stats?.totalOrders || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="glass-card overflow-hidden stagger-fade-in" style={{ animationDelay: '300ms' }}>
        <div className="flex flex-row items-center justify-between border-b border-white/30 px-5 py-4">
          <h2 className="font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            实时订单
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/orders')}
            className="rounded-full bg-white/60 backdrop-blur-sm hover:bg-white/80 active:scale-95 transition-transform"
          >
            查看全部
          </Button>
        </div>
        <div className="p-5">
          {recentOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="暂无订单"
              description="等待新订单到来"
            />
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order, i) => (
                <div
                  key={order.id}
                  className="order-card flex items-center justify-between p-4 stagger-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                  onClick={() => navigate('/orders')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{order.orderNo}</span>
                      {getStatusBadge(order.status, order.paymentStatus)}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground truncate">
                      {order.items.map((i) => i.productName).join(', ')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-lg gradient-text">{formatPrice(order.total)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-transform"
                    >
                      处理
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
