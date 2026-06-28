import { useState } from 'react';
import { Plus, Minus, Star, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { formatPrice } from '../lib/utils';
import type { Product } from '../../../shared/types';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: ProductCardProps) {
  const { items, addItem, removeItem, updateQuantity } = useCartStore();
  const [imageError, setImageError] = useState(false);

  const cartItem = items.find((item) => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleAdd = () => {
    if (!product.isAvailable) return;
    addItem(product);
  };

  const handleRemove = () => {
    if (quantity <= 1) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, quantity - 1);
    }
  };

  if (compact) {
    return (
      <div className="glass-card product-card-hover overflow-hidden group cursor-pointer">
        {/* 图片区域 */}
        <div className="relative aspect-square overflow-hidden">
          {product.image && !imageError ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-primary/40" />
            </div>
          )}

          {/* 推荐标签 */}
          {product.isRecommended && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-accent to-accent-light text-white text-xs px-2 py-0.5 rounded-full shadow-md">
              <Star className="h-3 w-3" />
              <span>推荐</span>
            </div>
          )}

          {/* 售罄遮罩 */}
          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-medium text-sm bg-black/50 px-3 py-1 rounded-full">
                已售罄
              </span>
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{product.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-bold gradient-text">{formatPrice(product.price)}</span>
            {quantity > 0 ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                  className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-sm font-medium w-5 text-center">{quantity}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                  className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-dark transition-colors shadow-md"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                disabled={!product.isAvailable}
                className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-dark transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card product-card-hover overflow-hidden group">
      {/* 图片区域 */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {product.image && !imageError ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-primary/40" />
          </div>
        )}

        {/* 推荐标签 */}
        {product.isRecommended && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-accent to-accent-light text-white text-xs px-2.5 py-1 rounded-full shadow-md">
            <Star className="h-3 w-3" />
            <span>店长推荐</span>
          </div>
        )}

        {/* 售罄遮罩 */}
        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white font-medium bg-black/50 px-4 py-1.5 rounded-full">
              已售罄
            </span>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        <h3 className="font-semibold text-base truncate">{product.name}</h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>

        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold gradient-text">{formatPrice(product.price)}</span>

          {quantity > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRemove}
                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium w-6 text-center">{quantity}</span>
              <button
                onClick={handleAdd}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-dark transition-colors shadow-md"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={!product.isAvailable}
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-dark transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
