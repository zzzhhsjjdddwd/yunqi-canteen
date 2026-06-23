import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order } from '../../../shared/types';

interface OrderStore {
  orders: Order[];
  currentOrder: Order | null;
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: string) => void;
  setCurrentOrder: (order: Order | null) => void;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      orders: [],
      currentOrder: null,

      setOrders: (orders) => set({ orders }),

      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
          currentOrder: order,
        })),

      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status: status as Order['status'] } : o
          ),
          currentOrder:
            state.currentOrder?.id === orderId
              ? { ...state.currentOrder, status: status as Order['status'] }
              : state.currentOrder,
        })),

      setCurrentOrder: (order) => set({ currentOrder: order }),
    }),
    {
      name: 'order-storage',
    }
  )
);
