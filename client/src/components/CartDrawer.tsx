import { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, UtensilsCrossed, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { formatPrice, cn } from '../lib/utils';
import { Button } from './ui/Button';
import { EmptyState } from './Loading';

interface CartDrawerProps {
  trigger: React.ReactNode;
  isEmpty: boolean;
}

export default function CartDrawer({ trigger, isEmpty }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();
  const [open, setOpen] = useState(false);
  const [removedId, setRemovedId] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleRemove = (productId: string) => {
    setRemovedId(productId);
    setTimeout(() => removeItem(productId), 150);
  };

  const handleCheckout = () => {
    setOpen(false);
    navigate('/menu/checkout');
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEmpty) {
      setOpen(!open);
    }
  };

  return (
    <div className="relative" ref={drawerRef}>
      <div onClick={handleTriggerClick}>
        {trigger}
      </div>
      
      {open && !isEmpty && (
        <div 
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[calc(100vw-32px)] max-w-md',
            'animate-cart-drawer-in origin-bottom'
          )}
          style={{ marginBottom: '12px' }}
        >
          <div className="relative">
            <div className={cn(
              'glass-card overflow-hidden',
              'shadow-[0_-4px_32px_rgba(0,0,0,0.12),0_-2px_8px_rgba(0,0,0,0.08)]',
              'border border-white/60 backdrop-blur-2xl',
              'rounded-2xl'
            )}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/30 bg-white/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">购物车</h3>
                    <p className="text-xs text-muted-foreground">{items.length} 种商品</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/60 transition-colors active:scale-95"
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto scrollbar-hide">
                {items.length === 0 ? (
                  <div className="py-8">
                    <EmptyState
                      icon={UtensilsCrossed}
                      title="购物车空空如也"
                      description="去菜单挑选喜欢的美味吧"
                    />
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {items.map(({ product, quantity }) => (
                      <div
                        key={product.id}
                        className={cn(
                          'flex items-center gap-3 p-2.5 rounded-xl bg-white/50 transition-all duration-200',
                          removedId === product.id ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                        )}
                      >
                        <img
                          src={product.image || '/placeholder.png'}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover shadow-sm flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 truncate">{product.name}</h4>
                          <p className="text-xs font-semibold gradient-text">{formatPrice(product.price)}</p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/60 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:scale-105 active:scale-95"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/60 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:scale-105 active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemove(product.id)}
                            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-destructive/70 transition-all hover:bg-destructive/10 hover:text-destructive hover:scale-105 active:scale-95"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="px-4 py-3 border-t border-white/30 bg-white/50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">小计</p>
                      <p className="text-xl font-bold gradient-text">{formatPrice(getTotal())}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearCart}
                      className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-transform text-xs h-8"
                    >
                      清空
                    </Button>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    className="w-full rounded-full h-11 font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] transition-all"
                  >
                    去结算
                  </Button>
                </div>
              )}
            </div>

            <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-white/90 backdrop-blur-2xl border-r border-b border-white/60 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
