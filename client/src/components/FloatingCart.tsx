import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { formatPrice, cn } from '../lib/utils';
import { useScrollY } from '../hooks/useScrollY';
import CartSheet from './CartSheet';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface CartSummary {
  count: number;
  total: number;
}

const EMPTY_SUMMARY: CartSummary = { count: 0, total: 0 };

/**
 * 悬浮购物车
 * - 使用 Button、Badge 等组件库构建
 * - 居中卡片样式，跟随滚动位置
 * - 有商品时深色强调，空购物车时淡色弱化
 */
function FloatingCartComponent() {
  const navigate = useNavigate();
  const scrollY = useScrollY();

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

  return (
    <div
      className={cn('floating-cart', isEmpty && 'floating-cart--empty')}
      role="region"
      aria-label="购物车栏"
      style={{ top: `${scrollY}px` }}
    >
      <div className="floating-cart__card">
        <CartSheet>
          <Button
            variant={isEmpty ? 'ghost' : 'default'}
            size="sm"
            className={cn(
              'floating-cart__cart-btn relative transition-all duration-300',
              isEmpty && 'opacity-60'
            )}
            aria-label={isEmpty ? '购物车，空空如也' : `购物车，共 ${summary.count} 件商品`}
          >
            <ShoppingBag className="h-5 w-5" />
            {!isEmpty && (
              <Badge
                variant="destructive"
                className={cn(
                  'absolute -top-1 -right-1 h-5 min-w-5 justify-center px-1 text-[10px]',
                  'badge-pulse'
                )}
              >
                {summary.count}
              </Badge>
            )}
            <span className="ml-1 text-sm font-medium">购物车</span>
          </Button>
        </CartSheet>

        <div className="floating-cart__divider" />

        <div className="floating-cart__summary">
          <span className="text-xs text-muted-foreground">合计</span>
          <span className={cn(
            'text-lg font-bold transition-all duration-300',
            isEmpty ? 'text-muted-foreground' : 'gradient-text'
          )}>
            {totalLabel}
          </span>
        </div>

        <div className="floating-cart__divider" />

        <Button
          onClick={() => navigate('/menu/checkout')}
          variant={isEmpty ? 'ghost' : 'default'}
          size="sm"
          disabled={isEmpty}
          className={cn(
            'floating-cart__checkout-btn transition-all duration-300',
            isEmpty && 'pointer-events-none'
          )}
          aria-label="去结算"
        >
          去结算
        </Button>
      </div>
    </div>
  );
}

const FloatingCart = memo(FloatingCartComponent);
export default FloatingCart;
