import type { Category, Product, Order, CreateOrderRequest, User, Address, AuthResponse } from '../../../shared/types';
import { useAuthStore } from '../stores/authStore';

// API请求基础路径 - 开发环境通过Vite代理，生产环境通过Vercel rewrites
const API_BASE = '';

function getHeaders(): HeadersInit {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败，请检查网络连接' }));
    throw new Error(error.error || '请求失败，请检查网络连接');
  }

  return response.json();
}

// Auth
export async function register(phone: string, password: string, nickname?: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ phone, password, nickname }),
  });
}

export async function login(phone: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

export async function getMe(): Promise<User> {
  return request<User>('/api/auth/me');
}

export async function updateProfile(data: { nickname?: string; avatar?: string }): Promise<User> {
  return request<User>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Addresses
export async function getAddresses(): Promise<Address[]> {
  return request<Address[]>('/api/addresses');
}

export async function createAddress(data: Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Address> {
  return request<Address>('/api/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAddress(id: string, data: Partial<Address>): Promise<Address> {
  return request<Address>(`/api/addresses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAddress(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/addresses/${id}`, {
    method: 'DELETE',
  });
}

export async function setDefaultAddress(id: string): Promise<Address> {
  return request<Address>(`/api/addresses/${id}/default`, {
    method: 'PATCH',
  });
}

// Categories
export async function getCategories(): Promise<Category[]> {
  return request<Category[]>('/api/categories');
}

// Products
export async function getProducts(): Promise<Product[]> {
  return request<Product[]>('/api/products');
}

export async function getProduct(id: string): Promise<Product> {
  return request<Product>(`/api/products/${id}`);
}

// Orders
export async function createOrder(data: CreateOrderRequest): Promise<Order> {
  return request<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getOrder(id: string): Promise<Order> {
  return request<Order>(`/api/orders/${id}`);
}

export async function getOrders(status?: string): Promise<Order[]> {
  const params = status ? `?status=${status}` : '';
  return request<Order[]>(`/api/orders${params}`);
}

export async function cancelOrder(id: string): Promise<Order> {
  return request<Order>(`/api/orders/${id}/cancel`, {
    method: 'POST',
  });
}

// Settings
export async function getPaymentQR(): Promise<{ paymentQR: string | null }> {
  return request<{ paymentQR: string | null }>('/api/settings/payment-qr');
}

export async function getSetting<T>(key: string): Promise<T> {
  return request<T>(`/api/settings/${key}`);
}
