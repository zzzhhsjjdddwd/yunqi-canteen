import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Package, CheckCircle2, XCircle, ChefHat, Home, RefreshCw, CreditCard, XOctagon, MapPin, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/Button';
import OrderStatus from '../components/OrderStatus';
import { OrdersPageSkeleton, EmptyState } from '../components/Loading';
import PaymentModal from '../components/PaymentModal';
import { getOrders, cancelOrder } from '../lib/api';
import { formatPrice, formatDate } from '../lib/utils';
import { useOrderStore } from '../stores/orderStore';
import { onOrderStatusUpdate } from '../lib/socket';
import type { Order } from '../../../shared/types';

export default function OrdersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orders = useOrderStore((state) => state.orders);
  const setOrders = useOrderStore((state) => state.setOrders);
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await getOrders();
        setOrders(data);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
    fetchOrders();
  }, [setOrders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to refresh orders:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onOrderStatusUpdate((data) => {
      updateOrderStatus(data.orderId, data.status);
    });
    return () => unsubscribe();
  }, [updateOrderStatus]);

  if (loading) {
    return <OrdersPageSkeleton />;
  }

  if (id) {
    // 优先按 id 精确查找；找不到时不要再退到 orders[0]（会出现"显示别的订单"的误导）
    const order = orders.find((o) => o.id === id);
    if (!order) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
          <div className="glass-card flex flex-col items-center justify-center p-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-muted-foreground font-medium">订单不存在</p>
            <Button onClick={() => window.history.back()} className="mt-4 glass-button active:scale-95 transition-transform">
              返回
            </Button>
          </div>
        </div>
      );
    }
    return <OrderDetail order={order} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between stagger-fade-in" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="glass-card flex h-11 w-11 items-center justify-center hover:scale-105 active:scale-95 transition-all"
          >
            <Home className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold gradient-text">我的订单</h1>
            <p className="text-sm text-muted-foreground mt-1">查看您的所有订单记录</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="glass-card flex h-11 w-11 items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
        >
          <RefreshCw className={`h-5 w-5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {orders.length === 0 ? (
        <div className="stagger-fade-in" style={{ animationDelay: '100ms' }}>
          <EmptyState
            icon={Package}
            title="还没有订单"
            description="去菜单看看，开启第一单美味吧"
            action={
              <Button
                onClick={() => navigate('/')}
                className="glass-button active:scale-95 transition-transform"
              >
                去点餐
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <div
              key={order.id}
              className="stagger-fade-in"
              style={{ animationDelay: `${100 + i * 50}ms` }}
            >
              <OrderCard order={order} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const getStatusIcon = () => {
    switch (order.status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'paid': return <CreditCard className="h-4 w-4" />;
      case 'making': return <ChefHat className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (order.status) {
      case 'pending': return 'text-amber-600';
      case 'paid': return 'text-emerald-600';
      case 'making': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="glass-card overflow-hidden transition-all hover:shadow-xl hover:-translate-y-0.5 duration-200 cursor-pointer group active:scale-[0.99]"
         onClick={() => (window.location.href = `/orders/${order.id}`)}>
      <div className="px-4 py-3 border-b border-white/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 ${getStatusColor()}`}>
            {getStatusIcon()}
          </span>
          <span className="text-sm font-medium text-muted-foreground">订单号: {order.orderNo}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
          order.status === 'completed' ? 'bg-green-100 text-green-600' :
          order.status === 'making' ? 'bg-blue-100 text-blue-600' :
          order.status === 'paid' ? 'bg-emerald-100 text-emerald-600' :
          'bg-amber-100 text-amber-600'
        }`}>
          {order.status === 'pending' ? '待处理' :
           order.status === 'paid' ? '已支付' :
           order.status === 'making' ? '制作中' :
           order.status === 'completed' ? '已完成' :
           order.status === 'cancelled' ? '已取消' : order.status}
        </span>
      </div>
      <div className="p-4">
        <div className="space-y-2">
          {order.items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate font-medium">{item.productName}</span>
              <span className="text-muted-foreground">x{item.quantity}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs text-muted-foreground">还有 {order.items.length - 3} 件商品</p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold gradient-text">{formatPrice(order.total)}</span>
            <p className="text-xs text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full bg-white/60 backdrop-blur-sm hover:bg-white/80 group-hover:bg-primary/10 group-hover:text-primary transition-all active:scale-95"
          >
            查看详情
          </Button>
        </div>
      </div>
    </div>
  );
}

function OrderDetail({ order }: { order: Order }) {
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelOrder = async () => {
    if (!confirm('确定要取消这个订单吗？')) return;
    setCancelling(true);
    try {
      await cancelOrder(order.id);
      navigate('/orders');
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert('取消订单失败，请重试');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between stagger-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/orders')}
              className="glass-card flex h-11 w-11 items-center justify-center hover:scale-105 active:scale-95 transition-all"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold gradient-text">订单详情</h1>
              <p className="text-sm text-muted-foreground">{order.orderNo}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="glass-card flex h-11 w-11 items-center justify-center hover:scale-105 active:scale-95 transition-all"
          >
            <Home className="h-5 w-5 text-muted-foreground" />
          </button>
        </header>

        <div className="space-y-4">
          <div className="stagger-fade-in" style={{ animationDelay: '60ms' }}>
            <OrderStatus status={order.status} paymentStatus={order.paymentStatus} />
          </div>

          {/* 收货地址 */}
          {order.address && (
            <div className="glass-card overflow-hidden stagger-fade-in" style={{ animationDelay: '120ms' }}>
              <div className="px-4 py-3 border-b border-white/30">
                <h2 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  收货地址
                </h2>
              </div>
              <div className="p-4">
                <p className="font-medium">
                  {order.address.name}
                  <span className="ml-3 text-muted-foreground font-normal">{order.address.phone}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {order.address.province} {order.address.city} {order.address.district} {order.address.detail}
                </p>
              </div>
            </div>
          )}

          {/* 商品明细 */}
          <div className="glass-card overflow-hidden stagger-fade-in" style={{ animationDelay: '180ms' }}>
            <div className="px-4 py-3 border-b border-white/30">
              <h2 className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                商品明细
              </h2>
            </div>
            <div className="divide-y divide-white/20">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">x{item.quantity}</p>
                  </div>
                  <p className="font-semibold gradient-text">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 订单金额 */}
          <div className="glass-card overflow-hidden stagger-fade-in" style={{ animationDelay: '240ms' }}>
            <div className="px-4 py-3 border-b border-white/30">
              <h2 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                订单信息
              </h2>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground">订单金额</span>
                <span className="text-xl font-bold gradient-text">{formatPrice(order.total)}</span>
              </div>
              {order.remark && (
                <div className="mt-3 rounded-xl bg-muted/50 p-3 backdrop-blur-sm">
                  <span className="text-sm text-muted-foreground">备注: </span>
                  <span className="text-sm font-medium">{order.remark}</span>
                </div>
              )}
              <p className="mt-4 text-xs text-muted-foreground">下单时间: {formatDate(order.createdAt)}</p>
            </div>
          </div>

          {/* 待支付时显示操作按钮 */}
          {order.paymentStatus === 'unpaid' && order.status === 'pending' && (
            <div className="flex gap-3 stagger-fade-in" style={{ animationDelay: '300ms' }}>
              <button
                onClick={() => setShowPayment(true)}
                className="glass-button flex-1 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <CreditCard className="h-5 w-5" />
                立即支付
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="flex-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 font-medium shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
              >
                {cancelling ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <XOctagon className="h-5 w-5" />
                )}
                取消订单
              </button>
            </div>
          )}
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          open={showPayment}
          onClose={() => setShowPayment(false)}
          orderId={order.id}
          orderNo={order.orderNo}
        />
      )}
    </>
  );
}
