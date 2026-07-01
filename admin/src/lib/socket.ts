import { io, Socket } from 'socket.io-client';
import type { NewOrderData, OrderStatusUpdateData, PaymentConfirmData } from '../../../shared/types';

let socket: Socket | null = null;
let currentToken: string | null = null;

const SERVER_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'https://yunqi-deploy.onrender.com');

function getToken(): string | null {
  return localStorage.getItem('admin-token');
}

export function initSocket() {
  const token = getToken();

  if (socket && currentToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  socket = io(SERVER_URL || window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    withCredentials: false,
    forceNew: true,
    auth: token ? { token, role: 'admin' } : undefined,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    socket?.emit('join:admin');
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
}

export function getSocket(): Socket {
  if (!socket) {
    return initSocket();
  }
  return socket;
}

export function joinAdminRoom() {
  getSocket().emit('join:admin');
}

export function onNewOrder(callback: (data: NewOrderData) => void) {
  getSocket().on('order:create', callback);
  return () => {
    getSocket().off('order:create', callback);
  };
}

export function onPaymentConfirm(callback: (data: PaymentConfirmData) => void) {
  getSocket().on('payment:confirm', callback);
  return () => {
    getSocket().off('payment:confirm', callback);
  };
}

export function onOrderStatusUpdate(callback: (data: OrderStatusUpdateData) => void) {
  getSocket().on('order:status-update', callback);
  return () => {
    getSocket().off('order:status-update', callback);
  };
}

export function onOrderCancelled(callback: (data: { orderId: string; orderNo: string; status: string }) => void) {
  getSocket().on('order:cancelled', callback);
  return () => {
    getSocket().off('order:cancelled', callback);
  };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
