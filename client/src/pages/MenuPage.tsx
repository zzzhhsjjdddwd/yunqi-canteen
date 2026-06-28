import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Search, Flame } from 'lucide-react';
import { getProducts, getCategories } from '../lib/api';
import ProductCard from '../components/ProductCard';
import PaymentQRCard from '../components/PaymentQRCard';
import type { Product, Category } from '../../../shared/types';

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData.sort((a: Category, b: Category) => a.sortOrder - b.sortOrder));
      setError('');
    } catch (err) {
      setError('加载菜单失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let result = products;

    if (activeCategory !== 'all') {
      result = result.filter((p) => p.categoryId === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [products, activeCategory, searchQuery]);

  const recommendedProducts = useMemo(
    () => products.filter((p) => p.isRecommended && p.isAvailable),
    [products]
  );

  if (loading) {
    return <MenuPageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="glass-card p-8 space-y-4">
            <p className="text-destructive font-medium">{error}</p>
            <button onClick={loadData} className="glass-button px-6 py-2 text-sm">
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 page-fade-in">
      {/* 收款二维码卡片 */}
      <PaymentQRCard />

      {/* 搜索栏 */}
      <div className="mx-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索美食..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl glass-input"
          />
        </div>
      </div>

      {/* 推荐商品 */}
      {!searchQuery && recommendedProducts.length > 0 && (
        <div className="mx-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold gradient-text flex items-center gap-2">
              <Flame className="h-5 w-5 text-accent" />
              店长推荐
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
            {recommendedProducts.map((product) => (
              <div key={product.id} className="snap-start flex-shrink-0 w-44">
                <ProductCard product={product} compact />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 分类导航 */}
      <div className="sticky top-14 z-30 bg-background/80 backdrop-blur-lg border-b border-white/60">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === 'all'
                ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-md shadow-primary/25'
                : 'bg-white/50 text-muted-foreground hover:bg-white/70 hover:text-foreground border border-white/60'
            }`}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === category.id
                  ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-md shadow-primary/25'
                  : 'bg-white/50 text-muted-foreground hover:bg-white/70 hover:text-foreground border border-white/60'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* 商品列表 */}
      <div className="mx-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {searchQuery ? '没有找到相关商品' : '该分类暂无商品'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className="stagger-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
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

function MenuPageSkeleton() {
  return (
    <div className="space-y-6 pb-8">
      <div className="mx-4 mt-4">
        <div className="glass-card p-5">
          <div className="h-6 w-40 shimmer rounded-lg" />
          <div className="h-4 w-32 shimmer rounded-lg mt-2" />
          <div className="flex gap-2 mt-3">
            <div className="h-6 w-20 shimmer rounded-full" />
            <div className="h-6 w-20 shimmer rounded-full" />
          </div>
        </div>
      </div>

      <div className="mx-4">
        <div className="h-11 shimmer rounded-xl" />
      </div>

      <div className="mx-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44">
              <div className="h-48 shimmer rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-20 shimmer rounded-full flex-shrink-0" />
          ))}
        </div>
      </div>

      <div className="mx-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 shimmer rounded-xl" />
        ))}
      </div>
    </div>
  );
}
