import { useState } from 'react';
import { Plus, Check, UtensilsCrossed } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { formatPrice } from '../lib/utils';
import type { Product } from '../../../shared/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isSoldOut = product.status === 'inactive';
  const hasImage = product.image && !imageError;

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  return (
    <div
      className={`group glass-card product-card-hover overflow-hidden ${
        isSoldOut ? 'opacity-60 grayscale' : ''
      }`}
    >
      {/* 图片区域 */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
        {hasImage ? (
          <img
            src={product.image}
            alt={product.name}
            onError={() => setImageError(true)}
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              isSoldOut ? 'grayscale' : ''
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-primary/50">
              <UtensilsCrossed className="h-10 w-10" />
              <span className="text-xs font-medium">{product.name}</span>
            </div>
          </div>
        )}
        
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* 售罄标签 */}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <span className="rounded-full bg-black/70 px-5 py-2 text-sm font-semibold text-white backdrop-blur-sm">
              已售罄
            </span>
          </div>
        )}

        {/* 价格标签 - 无图片时显示在占位区域 */}
        {!isSoldOut && !hasImage && (
          <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 backdrop-blur-sm shadow-lg">
            <span className="text-sm font-bold text-primary">{formatPrice(product.price)}</span>
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="p-3">
        <h3 className="font-semibold text-foreground line-clamp-1">{product.name}</h3>
        {product.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        
        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-bold gradient-text">{formatPrice(product.price)}</span>
          {!isSoldOut && (
            <button
              onClick={handleAdd}
              className={`group/btn relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95 ${
                added 
                  ? 'bg-gradient-to-br from-success to-success/80 shadow-success/40' 
                  : 'bg-gradient-to-br from-primary to-primary-light shadow-primary/40 hover:shadow-xl hover:shadow-primary/50'
              }`}
            >
              {added ? (
                <Check className="h-4 w-4 animate-bounce" />
              ) : (
                <Plus className="h-4 w-4 transition-transform group-hover/btn:rotate-90" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}