import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, CartItem } from '../../../shared/types';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        set((state) => {
          const existing = state.items.find((item) => item.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          const newItem: CartItem = {
            id: `${product.id}-${Date.now()}`,
            productId: product.id,
            product: product,
            quantity: 1,
            price: product.price,
            createdAt: new Date().toISOString(),
          };
          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      },

      getCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
