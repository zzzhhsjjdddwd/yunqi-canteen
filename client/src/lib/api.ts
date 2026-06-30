import type { Category, Product, Order, CreateOrderRequest, User, Address, AuthResponse } from '../../../shared/types';
import { useAuthStore } from '../stores/authStore';
import { getCache, setCache } from './cache';

const API_BASE = import.meta.env.DEV ? '' : 'https://yunqi-deploy.onrender.com';

export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) {
    return API_BASE + url;
  }
  return url;
}

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
export async function authLoginRegister(phone: string, password: string, nickname?: string): Promise<AuthResponse> {
  try {
    return await request<AuthResponse>('/api/auth/auth', {
      method: 'POST',
      body: JSON.stringify({ phone, password, nickname }),
    });
  } catch (e: any) {
    if (e.message?.includes('404') || e.status === 404) {
      try {
        return await request<AuthResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ phone, password }),
        });
      } catch (loginError: any) {
        if (loginError.message?.includes('404') || loginError.status === 404) {
          return await request<AuthResponse>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ phone, password, nickname }),
          });
        }
        throw loginError;
      }
    }
    throw e;
  }
}

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
export async function getCategories(useCache: boolean = true): Promise<Category[]> {
  const cacheKey = 'categories';
  
  if (useCache) {
    const cached = getCache<Category[]>(cacheKey);
    if (cached) {
      request<Category[]>('/api/categories')
        .then(data => {
          setCache(cacheKey, data, 10 * 60 * 1000);
        })
        .catch(() => {});
      return cached;
    }
  }
  
  const data = await request<Category[]>('/api/categories');
  setCache(cacheKey, data, 10 * 60 * 1000);
  return data;
}

function normalizeProduct(p: any): Product {
  return {
    ...p,
    image: resolveImageUrl(p.image),
    isAvailable: p.isAvailable !== undefined ? p.isAvailable : p.status === 'active',
    isRecommended: p.isRecommended || false,
  };
}

// Products
export async function getProducts(useCache: boolean = true): Promise<Product[]> {
  const cacheKey = 'products';
  
  if (useCache) {
    const cached = getCache<any[]>(cacheKey);
    if (cached) {
      request<any[]>('/api/products')
        .then(data => {
          setCache(cacheKey, data, 5 * 60 * 1000);
        })
        .catch(() => {});
      return cached.map(normalizeProduct);
    }
  }
  
  const products = await request<any[]>('/api/products');
  setCache(cacheKey, products, 5 * 60 * 1000);
  return products.map(normalizeProduct);
}

export async function getProduct(id: string): Promise<Product> {
  const product = await request<any>(`/api/products/${id}`);
  return normalizeProduct(product);
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

export async function deleteOrder(id: string): Promise<Order> {
  return request<Order>(`/api/orders/${id}/delete`, {
    method: 'PATCH',
  });
}

// Settings
export async function getPaymentQR(): Promise<{ paymentQR: string | null }> {
  const result = await request<{ paymentQR: string | null }>('/api/settings/payment-qr');
  return {
    ...result,
    paymentQR: resolveImageUrl(result.paymentQR),
  };
}

export async function getSetting<T>(key: string): Promise<T> {
  return request<T>(`/api/settings/${key}`);
}
