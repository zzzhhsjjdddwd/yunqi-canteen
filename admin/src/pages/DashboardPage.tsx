import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  ChefHat,
  ArrowRight,
} from 'lucide-react';
import { getStats, getOrders } from '../lib/api';
import type { Order } from '../../../shared/types';
import { formatPrice } from '../lib/utils';

interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  totalProducts: number;
  totalUsers: number;
  preparingOrders?: number;
  readyOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const retryCountRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadDashboardData();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const scheduleNext = () => {
    if (!mountedRef.current) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    const baseInterval = 30000;
    const delay = error ? Math.min(baseInterval * Math.pow(2, retryCountRef.current), 300000) : baseInterval;
    timeoutRef.current = window.setTimeout(() => {
      loadDashboardData();
    }, delay);
  };

  const loadDashboardData = async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        getStats(),
        getOrders({ pageSize: 5 }),
      ]);
      if (!mountedRef.current) return;
      setStats(statsData);
      setRecentOrders(ordersData.orders);
      setError('');
      retryCountRef.current = 0;
    } catch (err) {
      if (!mountedRef.current) return;
      setError('加载数据失败，请刷新重试');
      retryCountRef.current = Math.min(retryCountRef.current + 1, 5);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        scheduleNext();
      }
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={loadDashboardData}
            className="glass-button px-6 py-2 text-sm"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: '今日订单',
      value: stats.todayOrders,
      icon: ShoppingCart,
      trend: stats.todayOrders > 0 ? '↑' : '0',
      trendUp: stats.todayOrders > 0,
      color: 'primary',
      path: '/orders',
    },
    {
      title: '今日营收',
      value: formatPrice(stats.todayRevenue),
      icon: DollarSign,
      trend: stats.todayRevenue > 0 ? '↑' : '0',
      trendUp: stats.todayRevenue > 0,
      color: 'accent',
      path: '/orders',
    },
    {
      title: '商品总数',
      value: stats.totalProducts,
      icon: Package,
      trend: '在售',
      trendUp: true,
      color: 'success',
      path: '/products',
    },
    {
      title: '用户总数',
      value: stats.totalUsers,
      icon: Users,
      trend: '活跃',
      trendUp: true,
      color: 'info',
      path: '/users',
    },
  ];

  const orderStatusCards = [
    { label: '待处理', value: stats.pendingOrders, icon: Clock, color: 'text-warning bg-warning/10 border-warning/20' },
    { label: '制作中', value: stats.preparingOrders || 0, icon: ChefHat, color: 'text-info bg-info/10 border-info/20' },
    { label: '待取餐', value: stats.readyOrders || 0, icon: AlertCircle, color: 'text-primary bg-primary/10 border-primary/20' },
    { label: '已完成', value: stats.completedOrders || 0, icon: CheckCircle, color: 'text-success bg-success/10 border-success/20' },
    { label: '已取消', value: stats.cancelledOrders || 0, icon: TrendingDown, color: 'text-destructive bg-destructive/10 border-destructive/20' },
  ];

  return (
    <div className="space-y-8 page-fade-in">
      {/* 欢迎区域 */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text-gold">商家控制台</h1>
            <p className="text-muted-foreground mt-1">实时监控店铺运营数据</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>数据实时更新</span>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <Link
            key={card.title}
            to={card.path}
            className="stat-card p-5 group cursor-pointer"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className={`icon-container icon-container-${card.color} w-11 h-11 rounded-xl`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${card.trendUp ? 'text-success' : 'text-destructive'}`}>
                {card.trendUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{card.trend}</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold gradient-text">{card.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{card.title}</p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <span>查看详情</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* 订单状态概览 */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold gradient-text mb-4">订单状态概览</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {orderStatusCards.map((status) => (
            <div
              key={status.label}
              className="flex items-center gap-3 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 hover:bg-white/70 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status.color}`}>
                <status.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold">{status.value}</p>
                <p className="text-xs text-muted-foreground">{status.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 最近订单 */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold gradient-text">最近订单</h2>
          <Link
            to="/orders"
            className="text-sm text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
          >
            查看全部
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>暂无订单</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                to={`/orders?orderId=${order.id}`}
                className="order-card p-4 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{order.orderNo}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.user?.nickname || order.user?.phone || '未知用户'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold gradient-text">{formatPrice(order.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="glass-card p-6">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-4 w-32 shimmer rounded-lg mt-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card p-5">
            <div className="h-11 w-11 shimmer rounded-xl" />
            <div className="h-8 w-20 shimmer rounded-lg mt-4" />
            <div className="h-4 w-24 shimmer rounded-lg mt-2" />
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <div className="h-6 w-32 shimmer rounded-lg mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 shimmer rounded-xl" />
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="h-6 w-32 shimmer rounded-lg mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 shimmer rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
