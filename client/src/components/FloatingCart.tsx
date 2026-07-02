import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, Trash2, ChevronDown, UtensilsCrossed } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { formatPrice, cn } from '../lib/utils';
import { Button } from './ui/Button';
import { EmptyState } from './Loading';

interface CartSummary {
  count: number;
  total: number;
}

const EMPTY_SUMMARY: CartSummary = { count: 0, total: 0 };

function FloatingCartComponent() {
  const navigate = useNavigate();
  const [bounce, setBounce] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [removedId, setRemovedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();

  const summary = useMemo<CartSummary>(
    () =>
      items.reduce<CartSummary>(
        (acc, item) => ({
          count: acc.count + item.quantity,
          total: acc.total + item.product.price * item.quantity,
        }),
        EMPTY_SUMMARY
      ),
    [items]
  );

  const totalLabel = useMemo(() => formatPrice(summary.total), [summary.total]);
  const isEmpty = summary.count === 0;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (summary.count > prevCount && summary.count > 0) {
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 600);
      return () => clearTimeout(timer);
    }
    setPrevCount(summary.count);
  }, [summary.count, prevCount]);

  useEffect(() => {
    if (!drawerOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [drawerOpen]);

  const handleRemove = (productId: string) => {
    setRemovedId(productId);
    setTimeout(() => removeItem(productId), 150);
  };

  const handleCheckout = () => {
    setDrawerOpen(false);
    navigate('/menu/checkout');
  };

  const handleCartButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEmpty) {
      setDrawerOpen(!drawerOpen);
    }
  };

  const cartContent = (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none',
        mounted && 'animate-fade-in-up'
      )}
      style={{
        padding: '0 16px calc(env(safe-area-inset-bottom, 0px) + 16px)',
      }}
      role="region"
      aria-label="购物车栏"
    >
      <div className="mx-auto w-full max-w-2xl" ref={containerRef}>
        {drawerOpen && !isEmpty && (
          <div
            className={cn(
              'mb-3 w-full',
              'animate-cart-drawer-in origin-bottom'
            )}
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
                    onClick={() => setDrawerOpen(false)}
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
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-12 w-12 rounded-lg object-cover shadow-sm flex-shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
                              <ShoppingBag className="h-5 w-5 text-primary/40" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 truncate">{product.name}</h4>
                            <p className="text-xs font-semibold gradient-text">{formatPrice(product.price)}</p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, quantity - 1); }}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/60 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:scale-105 active:scale-95"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, quantity + 1); }}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/60 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:scale-105 active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemove(product.id); }}
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

              <div className="absolute left-[60px] sm:left-[68px] -bottom-2 w-4 h-4 bg-white/90 backdrop-blur-2xl border-r border-b border-white/60 rotate-45" />
            </div>
          </div>
        )}

        <div
          className={cn(
            'pointer-events-auto relative flex items-center rounded-full',
            'bg-white/90 backdrop-blur-2xl border border-white/60',
            'shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]',
            'transition-all duration-300 ease-out',
            'px-2 sm:px-3 py-2 sm:py-2.5',
            isEmpty ? 'opacity-70' : 'opacity-100',
            bounce && 'animate-cart-bounce'
          )}
        >
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-60" />
          </div>

          <button
            onClick={handleCartButtonClick}
            className={cn(
              'relative flex items-center gap-2 pl-2 sm:pl-3 pr-3 sm:pr-4 py-2',
              'transition-all duration-200 active:scale-95',
              isEmpty ? 'cursor-default' : 'cursor-pointer'
            )}
            aria-label={isEmpty ? '购物车，空空如也' : `购物车，共 ${summary.count} 件商品`}
          >
            <div className="relative">
              <div
                className={cn(
                  'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center',
                  'transition-all duration-300',
                  isEmpty
                    ? 'bg-gray-100'
                    : 'bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30'
                )}
              >
                <ShoppingBag
                  className={cn(
                    'h-5 w-5 transition-colors duration-300',
                    isEmpty ? 'text-gray-400' : 'text-white'
                  )}
                />
              </div>
              {!isEmpty && (
                <div className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg shadow-red-500/30 animate-badge-pop">
                  {summary.count > 99 ? '99+' : summary.count}
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <span className={cn(
                'text-xs transition-colors duration-300',
                isEmpty ? 'text-gray-400' : 'text-gray-500'
              )}>
                购物车
              </span>
            </div>
          </button>

          <div className="w-px h-8 bg-gray-100 mx-1" />

          <div className="flex-1 flex flex-col justify-center min-w-0 px-2">
            {isEmpty ? (
              <span className="text-sm text-gray-400">去挑选美食吧~</span>
            ) : (
              <>
                <span className="text-[11px] text-gray-400 leading-tight">合计</span>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight">
                  {totalLabel}
                </span>
              </>
            )}
          </div>

          <div className="pr-1 sm:pr-1.5">
            <button
              onClick={() => navigate('/menu/checkout')}
              disabled={isEmpty}
              className={cn(
                'relative px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold text-sm',
                'transition-all duration-200 active:scale-95',
                'overflow-hidden',
                isEmpty
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5'
              )}
              aria-label="去结算"
            >
              {!isEmpty && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
              )}
              <span className="relative">去结算</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(cartContent, document.body);
}

const FloatingCart = memo(FloatingCartComponent);
export default FloatingCart;
