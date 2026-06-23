import { create } from 'zustand';
import type { Order } from '../../../shared/types';

interface OrderStore {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: string) => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],

  setOrders: (orders) => set({ orders }),

  addOrder: (order) =>
    set((state) => ({
      orders: [order, ...state.orders],
    })),

  updateOrder: (order) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === order.id ? order : o)),
    })),

  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, status: status as Order['status'] } : o)),
    })),
}));
