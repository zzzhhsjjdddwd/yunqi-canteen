import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Printer,
  Eye,
  CheckCircle,
  XCircle,
  ChefHat,
  Package,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Search,
  Inbox,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Input } from '../components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/Dialog';
import { AdminOrdersPageSkeleton, EmptyState } from '../components/Loading';
import { getOrders, updateOrderStatus, confirmPayment, deleteOrder } from '../lib/api';
import { onNewOrder, onOrderStatusUpdate, onOrderCancelled } from '../lib/socket';
import { printReceipt } from '../lib/printer';
import { formatPrice, formatDate, formatFullDate } from '../lib/utils';
import { useSpeaker } from '../hooks/useSpeaker';
import type { Order } from '../../../shared/types';

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { speakerEnabled, notifyNewOrder, notifyCancelled, notifyPaymentFailed } = useSpeaker();

  const notifyNewOrderRef = useRef(notifyNewOrder);
  const notifyCancelledRef = useRef(notifyCancelled);
  const notifyPaymentFailedRef = useRef(notifyPaymentFailed);

  useEffect(() => {
    notifyNewOrderRef.current = notifyNewOrder;
  }, [notifyNewOrder]);

  useEffect(() => {
    notifyCancelledRef.current = notifyCancelled;
  }, [notifyCancelled]);

  useEffect(() => {
    notifyPaymentFailedRef.current = notifyPaymentFailed;
  }, [notifyPaymentFailed]);

  // Fetch orders
  useEffect(() => {
    let cancelled = false;
    async function fetchOrders() {
      setLoading(true);
      try {
        const data = await getOrders({ limit: 500 });
        if (!cancelled) {
          setOrders(data);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  // WebSocket listeners (stable - memoized)
  const handleAddOrder = useCallback((data: any) => {
    const newOrder: Order = {
      id: data.orderId,
      orderNo: data.orderNo,
      items: data.items,
      total: data.total,
      status: 'pending',
      paymentStatus: 'unpaid',
      remark: data.remark,
      address: data.address,
      user: data.user,
      createdAt: data.createdAt,
      updatedAt: data.createdAt,
    };
    setOrders((prev) => [newOrder, ...prev]);
    if (speakerEnabled) {
      const itemCount = data.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
      notifyNewOrderRef.current(data.orderNo, data.total, itemCount);
    }
  }, [speakerEnabled]);

  const handleStatusUpdate = useCallback((data: any) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === data.orderId
          ? { ...o, status: data.status as Order['status'], updatedAt: new Date().toISOString() }
          : o
      )
    );
  }, []);

  const handleOrderCancelled = useCallback((data: any) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === data.orderId
          ? { ...o, status: 'cancelled', paymentStatus: 'cancelled' as any }
          : o
      )
    );
    if (speakerEnabled) {
      notifyCancelledRef.current(data.orderNo);
    }
  }, [speakerEnabled]);

  useEffect(() => {
    const unsubNew = onNewOrder(handleAddOrder);
    const unsubStatus = onOrderStatusUpdate(handleStatusUpdate);
    const unsubCancel = onOrderCancelled(handleOrderCancelled);
    return () => {
      unsubNew();
      unsubStatus();
      unsubCancel();
    };
  }, [handleAddOrder, handleStatusUpdate, handleOrderCancelled]);

  // Filter + search + pagination - useMemo to avoid recomputation on every render
  const filteredOrders = useMemo(() => {
    const lower = search.toLowerCase().trim();
    return orders.filter((order) => {
      // Filter by status
      let matchStatus = true;
      if (filter === 'pending') {
        matchStatus = order.paymentStatus === 'unpaid' && order.status === 'pending';
      } else if (filter === 'paid') {
        matchStatus = order.paymentStatus === 'paid';
      } else if (filter === 'active') {
        matchStatus = ['paid', 'making'].includes(order.status);
      } else if (filter === 'completed') {
        matchStatus = order.status === 'completed';
      }

      // Filter by search
      let matchSearch = true;
      if (lower) {
        matchSearch = !!(
          order.orderNo.toLowerCase().includes(lower) ||
          order.remark?.toLowerCase().includes(lower) ||
          order.user?.nickname?.toLowerCase().includes(lower) ||
          order.user?.phone?.includes(lower) ||
          order.address?.name?.toLowerCase().includes(lower) ||
          order.address?.phone?.includes(lower) ||
          order.address?.detail?.toLowerCase().includes(lower)
        );
      }

      return matchStatus && matchSearch;
    });
  }, [orders, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageOrders = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  // Reset page on filter / search change
  useEffect(() => {
    setPage(0);
  }, [filter, search]);

  // Update selected order reference when list updates
  useEffect(() => {
    if (selectedOrder && dialogOpen) {
      const updated = orders.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    }
  }, [orders, selectedOrder?.id, dialogOpen]);

  const handleConfirmPayment = async (orderId: string, success: boolean) => {
    try {
      await confirmPayment(orderId, success);
      let orderNo = '';
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            orderNo = o.orderNo;
            return {
              ...o,
              paymentStatus: success ? 'paid' : 'failed',
              status: success ? 'paid' : 'cancelled',
              updatedAt: new Date().toISOString(),
            } as Order;
          }
          return o;
        })
      );
      if (!success && speakerEnabled && orderNo) {
        notifyPaymentFailedRef.current(orderNo);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      alert('操作失败，请重试');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: status as Order['status'], updatedAt: new Date().toISOString() } : o
        )
      );
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('操作失败，请重试');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('确定要删除这个订单吗？删除后无法恢复。')) return;
    try {
      await deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete order:', error);
      alert('删除失败，请重试');
    }
  };

  const getStatusBadge = (order: Order) => {
    if (order.paymentStatus === 'unpaid' && order.status === 'pending') {
      return <span className="status-badge status-badge-pending">待支付</span>;
    }
    const configs: Record<string, { class: string; label: string }> = {
      paid: { class: 'status-badge-ready', label: '已支付' },
      making: { class: 'status-badge-preparing', label: '制作中' },
      preparing: { class: 'status-badge-preparing', label: '制作中' },
      completed: { class: 'status-badge-completed', label: '已完成' },
      cancelled: { class: 'status-badge-cancelled', label: '已取消' },
      failed: { class: 'status-badge-cancelled', label: '支付失败' },
    };
    const config = configs[order.status] || { class: 'status-badge-pending', label: order.status };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  if (loading) {
    return <AdminOrdersPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="stagger-fade-in" style={{ animationDelay: '0ms' }}>
        <h1 className="text-2xl font-bold gradient-text">订单管理</h1>
        <p className="text-sm text-muted-foreground mt-1">管理所有客户订单 · 共 {filteredOrders.length} 条</p>
      </div>

      {/* Search */}
      <div className="glass-card p-4 stagger-fade-in" style={{ animationDelay: '60ms' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索订单号、备注、用户、地址..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="stagger-fade-in" style={{ animationDelay: '120ms' }}>
        <TabsList className="bg-transparent gap-2 p-0 flex-wrap">
          <TabsTrigger value="all" className="rounded-full active:scale-95 transition-transform">全部 ({orders.length})</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-full active:scale-95 transition-transform">待支付</TabsTrigger>
          <TabsTrigger value="active" className="rounded-full active:scale-95 transition-transform">进行中</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-full active:scale-95 transition-transform">已完成</TabsTrigger>
        </TabsList>
      </Tabs>

      {pageOrders.length === 0 ? (
        <div className="stagger-fade-in" style={{ animationDelay: '180ms' }}>
          <EmptyState
            icon={Inbox}
            title="暂无订单"
            description={search ? '没有匹配的订单，试试其他关键词' : '等待新订单到来'}
          />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {pageOrders.map((order, i) => (
              <div key={order.id} className="stagger-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                <OrderCard
                  order={order}
                  onView={() => {
                    setSelectedOrder(order);
                    setDialogOpen(true);
                  }}
                  onPrint={() => printReceipt(order)}
                  getStatusBadge={getStatusBadge}
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="glass-card p-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                第 {currentPage + 1} / {totalPages} 页 · 共 {filteredOrders.length} 条
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="rounded-full active:scale-95 transition-transform"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="rounded-full active:scale-95 transition-transform"
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Order Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setTimeout(() => setSelectedOrder(null), 200);
        }}
      >
        <DialogContent className="rounded-2xl border-white/50 bg-white/90 backdrop-blur-xl max-w-lg max-h-[85vh] overflow-y-auto pop-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 gradient-text text-lg">
              <Package className="h-5 w-5 text-primary" />
              订单详情
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedOrder?.orderNo}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-3">
              {(selectedOrder.user || selectedOrder.address) && (
                <div className="glass-card p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-primary" />
                    客户信息
                  </h4>
                  {selectedOrder.user && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium text-foreground">
                        {selectedOrder.user.nickname || '未设置昵称'}
                      </span>{' '}
                      · {selectedOrder.user.phone}
                    </p>
                  )}
                  {selectedOrder.address && (
                    <p className="text-sm text-muted-foreground flex items-start gap-1">
                      <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>
                        {selectedOrder.address.name} {selectedOrder.address.phone}
                        <br />
                        {selectedOrder.address.province} {selectedOrder.address.city} {selectedOrder.address.district} {selectedOrder.address.detail}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div className="glass-card p-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <ChefHat className="h-4 w-4 text-primary" />
                  商品明细
                </h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.productName} x{item.quantity}
                      </span>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t border-white/30 pt-3">
                  <span className="font-medium">合计</span>
                  <span className="font-bold text-lg gradient-text">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.remark && (
                <div className="glass-card rounded-xl bg-amber-50/50 border-amber-200/50 p-4">
                  <p className="text-sm flex items-center gap-2">
                    <span className="font-medium text-amber-700">备注:</span>
                    <span className="text-amber-600">{selectedOrder.remark}</span>
                  </p>
                </div>
              )}

              <div className="glass-card p-4 text-sm text-muted-foreground">
                <p>下单时间: {formatFullDate(selectedOrder.createdAt)}</p>
                {selectedOrder.deletedByUser && (
                  <p className="mt-2 text-red-500 flex items-center gap-1">
                    <Trash2 className="h-4 w-4" />
                    <span className="font-medium">此订单已被用户删除</span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {selectedOrder.paymentStatus === 'unpaid' && selectedOrder.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => handleConfirmPayment(selectedOrder.id, true)}
                      className="rounded-full active:scale-95 transition-transform"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      确认收款
                    </Button>
                    <Button
                      onClick={() => handleConfirmPayment(selectedOrder.id, false)}
                      variant="destructive"
                      className="rounded-full active:scale-95 transition-transform"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      支付失败
                    </Button>
                  </>
                )}

                {selectedOrder.paymentStatus === 'paid' && selectedOrder.status === 'paid' && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'making')}
                    className="rounded-full active:scale-95 transition-transform"
                  >
                    <ChefHat className="h-4 w-4 mr-2" />
                    开始制作
                  </Button>
                )}

                {selectedOrder.status === 'making' && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                    className="rounded-full active:scale-95 transition-transform"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    完成订单
                  </Button>
                )}

                {['pending', 'paid', 'making'].includes(selectedOrder.status) && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                    className="rounded-full active:scale-95 transition-transform"
                  >
                    取消订单
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => printReceipt(selectedOrder)}
                  className="rounded-full active:scale-95 transition-transform"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  打印小票
                </Button>

                {['completed', 'cancelled'].includes(selectedOrder.status) && (
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                    className="rounded-full active:scale-95 transition-transform"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除订单
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Order card as separate memoized-like component to reduce prop allocation cost
function OrderCard({
  order,
  onView,
  onPrint,
  getStatusBadge,
}: {
  order: Order;
  onView: () => void;
  onPrint: () => void;
  getStatusBadge: (o: Order) => React.ReactNode;
}) {
  const productText = useMemo(
    () => order.items.map((i) => `${i.productName} x${i.quantity}`).join(', '),
    [order.items]
  );

  return (
    <div className="order-card p-4 cursor-pointer active:scale-[0.99] transition-all duration-200" onClick={onView}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{order.orderNo}</span>
            {getStatusBadge(order)}
            {order.deletedByUser && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs border border-gray-200">
                用户已删除
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{productText}</p>
          {(order.user || order.address) && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {order.user?.nickname || order.address?.name || '未登录用户'}
              {order.address?.phone ? ` · ${order.address.phone}` : ''}
              {order.address ? ` · ${order.address.detail}` : ''}
            </p>
          )}
          {order.remark && (
            <p className="mt-1 text-xs text-amber-600 truncate">
              <span className="font-medium">备注:</span> {order.remark}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <p className="text-lg font-bold gradient-text whitespace-nowrap">{formatPrice(order.total)}</p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-transform"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onPrint();
              }}
              className="rounded-full bg-muted/50 text-muted-foreground hover:bg-muted/80 active:scale-95 transition-transform"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
