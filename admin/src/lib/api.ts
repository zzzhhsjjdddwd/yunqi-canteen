import type { Category, Product, Order, StatsData, Settings } from '../../../shared/types';

// In development: Vite proxies /api to localhost:3001
// In production: Vercel rewrites /api to VITE_API_URL (configured in vercel.json)
const API_BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit, authenticated = false): Promise<T> {
  const token = localStorage.getItem('admin-token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (authenticated && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败，请检查网络连接' }));
    throw new Error(error.error || '请求失败，请检查网络连接');
  }

  return response.json();
}

// Auth
export async function login(username: string, password: string) {
  return request<{ token: string; admin: { id: string; username: string } }>(
    '/api/admin/login',
    { method: 'POST', body: JSON.stringify({ username, password }) }
  );
}

export async function verifyToken() {
  const token = localStorage.getItem('admin-token');
  if (!token) return { valid: false };
  try {
    return request<{ valid: boolean }>('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { valid: false };
  }
}

// Stats
export async function getStats(): Promise<StatsData> {
  return request<StatsData>('/api/admin/orders/stats', {}, true);
}

// Categories
export async function getCategories(): Promise<Category[]> {
  return request<Category[]>('/api/categories');
}

export async function createCategory(data: { name: string; sortOrder?: number }): Promise<Category> {
  return request<Category>('/api/admin/categories', { method: 'POST', body: JSON.stringify(data) }, true);
}

export async function updateCategory(id: string, data: { name?: string; sortOrder?: number }): Promise<Category> {
  return request<Category>(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }, true);
}

export async function deleteCategory(id: string): Promise<void> {
  return request<void>(`/api/admin/categories/${id}`, { method: 'DELETE' }, true);
}

// Products
export async function getProducts(): Promise<Product[]> {
  return request<Product[]>('/api/products');
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  return request<Product>('/api/admin/products', { method: 'POST', body: JSON.stringify(data) }, true);
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  return request<Product>(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }, true);
}

export async function deleteProduct(id: string): Promise<void> {
  return request<void>(`/api/admin/products/${id}`, { method: 'DELETE' }, true);
}

// Orders
export async function getOrders(params?: { status?: string; paymentStatus?: string; date?: string; limit?: number }): Promise<Order[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.paymentStatus) searchParams.set('paymentStatus', params.paymentStatus);
  if (params?.date) searchParams.set('date', params.date);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString();
  return request<Order[]>(`/api/admin/orders${query ? `?${query}` : ''}`, {}, true);
}

export async function updateOrderStatus(id: string, status: string): Promise<Order> {
  return request<Order>(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, true);
}

export async function confirmPayment(id: string, success: boolean): Promise<Order> {
  return request<Order>(`/api/admin/orders/${id}/confirm`, { method: 'POST', body: JSON.stringify({ success }) }, true);
}

export async function deleteOrder(id: string): Promise<void> {
  return request<void>(`/api/admin/orders/${id}`, { method: 'DELETE' }, true);
}

// Settings
export async function getPaymentQR(): Promise<{ paymentQR: string | null }> {
  return request<{ paymentQR: string | null }>('/api/settings/payment-qr');
}

export async function uploadPaymentQR(file: File): Promise<{ paymentQR: string }> {
  const token = localStorage.getItem('admin-token');
  const formData = new FormData();
  formData.append('qr', file);

  const response = await fetch(`${API_BASE}/api/admin/settings/payment-qr`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('上传失败');
  }
  return response.json();
}

export async function getSpeakerSettings(): Promise<Settings> {
  return request<Settings>('/api/admin/settings/speaker', {}, true);
}

export async function updateSpeakerSettings(data: Partial<Settings>): Promise<Settings> {
  return request<Settings>('/api/admin/settings/speaker', { method: 'PUT', body: JSON.stringify(data) }, true);
}

// Users
export async function getUsers(params?: { page?: number; limit?: number; search?: string }): Promise<{
  users: Array<{
    id: string;
    phone: string;
    nickname?: string;
    avatar?: string;
    createdAt: string;
    orderCount: number;
    addressCount: number;
  }>;
  total: number;
  page: number;
  totalPages: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);
  const query = searchParams.toString();
  return request<any>(`/api/admin/users${query ? `?${query}` : ''}`, {}, true);
}

export async function getUserDetail(id: string): Promise<any> {
  return request<any>(`/api/admin/users/${id}`, {}, true);
}

export async function deleteUser(id: string): Promise<void> {
  return request<void>(`/api/admin/users/${id}`, { method: 'DELETE' }, true);
}

export async function getUserStats(): Promise<{ totalUsers: number; usersWithOrders: number; totalAddresses: number }> {
  return request<any>('/api/admin/users/stats/summary', {}, true);
}
