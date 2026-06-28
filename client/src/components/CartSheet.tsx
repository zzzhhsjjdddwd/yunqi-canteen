import { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { formatPrice } from '../lib/utils';
import { Button } from './ui/Button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/Sheet';
import { EmptyState } from './Loading';

export default function CartSheet({ children }: { children: React.ReactNode }) {
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();
  const [removedId, setRemovedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRemove = (productId: string) => {
    setRemovedId(productId);
    setTimeout(() => removeItem(productId), 150);
  };

  const goToMenu = () => {
    // 关闭 sheet 由父级控制，这里只跳转
    navigate('/menu');
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-white/50 bg-white/90 backdrop-blur-xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5 text-primary" />
            购物车
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex max-h-[60vh] flex-col gap-3 overflow-y-auto scrollbar-hide">
          {items.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="购物车空空如也"
              description="去菜单挑选喜欢的美味吧"
              action={
                <Button
                  onClick={goToMenu}
                  className="glass-button rounded-full px-6 active:scale-95 transition-transform"
                >
                  去点餐
                </Button>
              }
            />
          ) : (
            <>
              {items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className={`glass-card flex items-center gap-4 p-4 transition-all ${
                    removedId === product.id ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  }`}
                >
                  <img
                    src={product.image || '/placeholder.png'}
                    alt={product.name}
                    className="h-16 w-16 rounded-xl object-cover shadow-md"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                    <p className="text-sm font-semibold gradient-text">{formatPrice(product.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-muted-foreground backdrop-blur-sm transition-all hover:bg-primary/10 hover:text-primary hover:scale-110 active:scale-95"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-muted-foreground backdrop-blur-sm transition-all hover:bg-primary/10 hover:text-primary hover:scale-110 active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemove(product.id)}
                      className="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-destructive/70 transition-all hover:bg-destructive/10 hover:text-destructive hover:scale-110 active:scale-95"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-4 flex items-center justify-between border-t border-white/30 pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">小计</p>
                  <p className="text-2xl font-bold gradient-text">{formatPrice(getTotal())}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-transform"
                >
                  清空购物车
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
