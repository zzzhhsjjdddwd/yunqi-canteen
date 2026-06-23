import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import Layout from './components/Layout';
import Loading from './components/Loading';
import { useAdminStore } from './stores/adminStore';
import { joinAdminRoom } from './lib/socket';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

/** 用 key 触发页面切换淡入动画 */
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

  useEffect(() => {
    if (isAuthenticated) {
      joinAdminRoom();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<Loading />}>
        <AnimatedOutlet>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AnimatedOutlet>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<Loading />}>
      <AnimatedOutlet>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AnimatedOutlet>
    </Suspense>
  );
}

export default App;
