import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import Layout from './components/Layout';
import Loading from './components/Loading';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

const MenuPage = lazy(() => import('./pages/MenuPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AddressesPage = lazy(() => import('./pages/AddressesPage'));
const AddressFormPage = lazy(() => import('./pages/AddressFormPage'));

/** 用 key 触发页面切换淡入动画 */
function AnimatedOutlet() {
  const location = useLocation();
  const [animKey, setAnimKey] = useState(location.pathname);

  useEffect(() => {
    // 路由变更时重新挂载子页面以触发 CSS 动画
    setAnimKey(location.pathname);
  }, [location.pathname]);

  return (
    <div key={animKey} className="page-fade-in">
      <Routes location={location}>
        {/* 登录页 - 首页 */}
        <Route path="/" element={<LoginPage />} />

        {/* 需要登录的页面 */}
        <Route
          path="/menu"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MenuPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrdersPage />} />
        </Route>

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/addresses"
          element={
            <ProtectedRoute>
              <AddressesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/addresses/new"
          element={
            <ProtectedRoute>
              <AddressFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/addresses/:id"
          element={
            <ProtectedRoute>
              <AddressFormPage />
            </ProtectedRoute>
          }
        />

        {/* 兜底重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <AnimatedOutlet />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
