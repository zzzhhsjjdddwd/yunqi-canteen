import { memo, useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ChevronUp } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { formatPrice, cn } from '../lib/utils';
import CartSheet from './CartSheet';

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

  const items = useCartStore((state) => state.items);

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
      <div className="mx-auto w-full max-w-2xl">
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

          <CartSheet>
            <button
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

              <div className="flex items-center gap-1">
                <span className={cn(
                  'text-xs transition-colors duration-300',
                  isEmpty ? 'text-gray-400' : 'text-gray-500'
                )}>
                  购物车
                </span>
                <ChevronUp
                  className={cn(
                    'h-4 w-4 transition-all duration-300',
                    isEmpty ? 'text-gray-300' : 'text-gray-400'
                  )}
                />
              </div>
            </button>
          </CartSheet>

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
