import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Star, UtensilsCrossed } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { HomePageSkeleton, EmptyState } from '../components/Loading';
import { getProducts, getCategories } from '../lib/api';
import type { Product, Category } from '../../../shared/types';

export default function HomePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsData, categoriesData] = await Promise.all([
          getProducts(),
          getCategories(),
        ]);
        setProducts(productsData.filter((p) => p.status !== 'inactive'));
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <HomePageSkeleton />;
  }

  // 取前4个分类作为快捷入口
  const featuredCategories = categories.slice(0, 4);
  // 取前6个热销商品
  const featuredProducts = products.slice(0, 6);

  return (
    <div className="pb-24">
      {/* 顶部欢迎语 */}
      <div className="px-4 pt-6 pb-4 stagger-fade-in" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm text-muted-foreground">欢迎来到</span>
        </div>
        <h1 className="text-2xl font-bold gradient-text">云栖浅食</h1>
        <p className="text-sm text-muted-foreground/80 mt-1">轻食 · 健康 · 新鲜</p>
      </div>

      {/* 横幅区域 */}
      <div className="px-4 mb-6 stagger-fade-in" style={{ animationDelay: '60ms' }}>
        <div className="glass-card relative overflow-hidden p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
          <div className="relative">
            <h2 className="text-lg font-semibold text-foreground mb-1">新用户专享</h2>
            <p className="text-sm text-muted-foreground mb-3">首单满25元减5元</p>
            <button
              onClick={() => navigate('/')}
              className="glass-button text-sm px-4 py-2 active:scale-95 transition-transform"
            >
              去点餐
            </button>
          </div>
        </div>
      </div>

      {/* 快捷分类入口 */}
      {featuredCategories.length > 0 && (
        <div className="px-4 mb-6 stagger-fade-in" style={{ animationDelay: '120ms' }}>
          <div className="grid grid-cols-4 gap-3">
            {featuredCategories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => navigate('/')}
                style={{ animationDelay: `${150 + i * 40}ms` }}
                className="glass-card p-3 text-center hover:scale-[1.04] hover:shadow-md active:scale-95 transition-all duration-200 stagger-fade-in"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <UtensilsCrossed className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-foreground font-medium truncate">{cat.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 热销商品 */}
      <div className="px-4 mb-6 stagger-fade-in" style={{ animationDelay: '180ms' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-accent fill-accent" />
            <h2 className="font-semibold text-foreground">热销商品</h2>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-xs text-primary hover:gap-2 transition-all"
          >
            查看全部 <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {featuredProducts.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="还没有商品"
            description="请联系商家上架商品后再来"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-4 text-center stagger-fade-in" style={{ animationDelay: '300ms' }}>
        <p className="text-xs text-muted-foreground/60">
          下拉刷新，发现更多美味
        </p>
      </div>
    </div>
  );
}
