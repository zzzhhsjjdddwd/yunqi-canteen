import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import Layout from './components/Layout';
import Loading from './components/Loading';
import { ErrorBoundary } from './components/ErrorBoundary';

const MenuPage = lazy(() => import('./pages/MenuPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
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
      {/* 渲染子路由 */}
      <Routes location={location}>
        <Route path="/" element={<Layout />}>
          <Route index element={<MenuPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrdersPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/addresses" element={<AddressesPage />} />
        <Route path="/addresses/new" element={<AddressFormPage />} />
        <Route path="/addresses/:id" element={<AddressFormPage />} />
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
