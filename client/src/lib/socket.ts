import { io, Socket } from 'socket.io-client';
import type { PaymentConfirmData, OrderStatusUpdateData } from '../../../shared/types';

let socket: Socket | null = null;
let currentToken: string | null = null;

const SERVER_URL = import.meta.env.DEV ? '' : 'https://yunqi-deploy.onrender.com';

function getToken(): string | null {
  try {
    const auth = localStorage.getItem('auth-storage');
    if (auth) {
      const parsed = JSON.parse(auth);
      return parsed?.state?.token || null;
    }
  } catch {
    return null;
  }
  return null;
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
    auth: token ? { token } : undefined,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    socket?.emit('join:client');
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

export function joinClientRoom() {
  getSocket().emit('join:client');
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
