import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { MenuPageSkeleton, EmptyState } from '../components/Loading';
import { getProducts } from '../lib/api';
import { getPaymentQR } from '../lib/api';
import { useSettingsStore } from '../stores/settingsStore';
import type { Product } from '../../../shared/types';

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const setPaymentQR = useSettingsStore((state) => state.setPaymentQR);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsData, qrData] = await Promise.all([
          getProducts(),
          getPaymentQR(),
        ]);
        setProducts(productsData.filter((p) => p.status !== 'inactive'));
        setPaymentQR(qrData.paymentQR);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在挂载时执行一次

  if (loading) {
    return <MenuPageSkeleton />;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* 全部商品 */}
      <div className="mb-4 stagger-fade-in" style={{ animationDelay: '0ms' }}>
        <h2 className="text-lg font-semibold text-foreground mb-4">全部商品</h2>
        {products.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="菜单暂无商品"
            description="请稍后再来，或联系商家咨询"
            action={
              <button
                onClick={() => navigate('/')}
                className="glass-button active:scale-95 transition-transform"
              >
                返回首页
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product, i) => (
              <div
                key={product.id}
                className="stagger-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
