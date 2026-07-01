import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState, useRef, useCallback } from 'react';
import Layout from './components/Layout';
import Loading from './components/Loading';
import NewOrderToast from './components/NewOrderToast';
import { ToastProvider } from './components/ui/Toast';
import { useAdminStore } from './stores/adminStore';
import { useOrderStore } from './stores/orderStore';
import { joinAdminRoom, onNewOrder, onOrderCancelled, getSocket } from './lib/socket';
import { useSpeaker } from './hooks/useSpeaker';
import { usePwaUpdate } from './hooks/usePwaUpdate';
import type { NewOrderData } from '../../shared/types';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const FinanceDashboardPage = lazy(() => import('./pages/FinanceDashboardPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const FinanceReportPage = lazy(() => import('./pages/FinanceReportPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));

function PwaUpdateBanner() {
  const { needRefresh } = usePwaUpdate();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] bg-primary text-white text-center py-2 text-sm shadow-lg">
      发现新版本，
      <button
        onClick={() => window.location.reload()}
        className="underline font-semibold ml-1 hover:text-white/90"
      >
        点击刷新
      </button>
    </div>
  );
}

function AnimatedOutlet({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [animKey, setAnimKey] = useState(location.pathname);

  useEffect(() => {
    setAnimKey(location.pathname);
  }, [location.pathname]);

  return (
    <div key={animKey} className="page-fade-in">
      {children}
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAdminStore();
  const { addOrder } = useOrderStore();
  const [newOrders, setNewOrders] = useState<NewOrderData[]>([]);
  const newOrderIdsRef = useRef<Set<string>>(new Set());

  const { notifyNewOrder, notifyCancelled, initAudio, speakerEnabled } = useSpeaker();

  const notifyNewOrderRef = useRef(notifyNewOrder);
  const notifyCancelledRef = useRef(notifyCancelled);

  useEffect(() => {
    notifyNewOrderRef.current = notifyNewOrder;
  }, [notifyNewOrder]);

  useEffect(() => {
    notifyCancelledRef.current = notifyCancelled;
  }, [notifyCancelled]);

  const handleNewOrder = useCallback(
    (data: NewOrderData) => {
      if (newOrderIdsRef.current.has(data.orderId)) return;
      newOrderIdsRef.current.add(data.orderId);

      setNewOrders((prev) => [...prev, data]);

      const fullOrder = {
        id: data.orderId,
        orderNo: data.orderNo,
        total: data.total,
        status: 'pending' as const,
        paymentStatus: 'unpaid' as const,
        items: data.items,
        remark: data.remark,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt || data.createdAt,
      } as any;
      addOrder(fullOrder);

      if (speakerEnabled) {
        const itemCount = data.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        notifyNewOrderRef.current(data.orderNo, data.total, itemCount);
      }

      setTimeout(() => {
        newOrderIdsRef.current.delete(data.orderId);
      }, 60000);
    },
    [addOrder, speakerEnabled]
  );

  const handleOrderCancelled = useCallback(
    (data: { orderId: string; orderNo: string; status: string }) => {
      if (speakerEnabled) {
        notifyCancelledRef.current(data.orderNo);
      }
    },
    [speakerEnabled]
  );

  const removeToast = useCallback((orderId: string) => {
    setNewOrders((prev) => prev.filter((o) => o.orderId !== orderId));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    const handleConnect = () => {
      joinAdminRoom();
    };

    if (socket.connected) {
      joinAdminRoom();
    } else {
      socket.on('connect', handleConnect);
    }

    const unsubNewOrder = onNewOrder(handleNewOrder);
    const unsubCancelled = onOrderCancelled(handleOrderCancelled);

    return () => {
      socket.off('connect', handleConnect);
      unsubNewOrder();
      unsubCancelled();
    };
  }, [isAuthenticated, handleNewOrder, handleOrderCancelled]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleFirstInteraction = () => {
      initAudio();
      window.removeEventListener('click', handleFirstInteraction, true);
      window.removeEventListener('keydown', handleFirstInteraction, true);
      window.removeEventListener('touchstart', handleFirstInteraction, true);
    };

    window.addEventListener('click', handleFirstInteraction, true);
    window.addEventListener('keydown', handleFirstInteraction, true);
    window.addEventListener('touchstart', handleFirstInteraction, true);

    return () => {
      window.removeEventListener('click', handleFirstInteraction, true);
      window.removeEventListener('keydown', handleFirstInteraction, true);
      window.removeEventListener('touchstart', handleFirstInteraction, true);
    };
  }, [isAuthenticated, initAudio]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const socket = getSocket();
        if (!socket.connected) {
          socket.connect();
        } else {
          joinAdminRoom();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleOnline = () => {
      const socket = getSocket();
      if (!socket.connected) {
        socket.connect();
      }
    };

    window.addEventListener('online', handleOnline);

    let keepAliveInterval: number | null = null;
    keepAliveInterval = window.setInterval(() => {
      const socket = getSocket();
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 25000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if (keepAliveInterval) {
        window.clearInterval(keepAliveInterval);
      }
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <PwaUpdateBanner />
        <Suspense fallback={<Loading />}>
          <AnimatedOutlet>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AnimatedOutlet>
        </Suspense>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <>
        <PwaUpdateBanner />
        <Suspense fallback={<Loading />}>
          <AnimatedOutlet>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="finance" element={<FinanceDashboardPage />} />
                <Route path="finance/transactions" element={<TransactionsPage />} />
                <Route path="finance/report" element={<FinanceReportPage />} />
                <Route path="finance/invoices" element={<InvoicesPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </AnimatedOutlet>
        </Suspense>

        {newOrders.map((order) => (
          <NewOrderToast
            key={order.orderId}
            order={order}
            onClose={() => removeToast(order.orderId)}
          />
        ))}
      </>
    </ToastProvider>
  );
}

export default App;
