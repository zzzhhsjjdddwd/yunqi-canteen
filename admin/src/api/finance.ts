// In development: Vite proxies /api to localhost:3001
const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'https://yunqi-deploy.onrender.com');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin-token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }
  return response.json();
}

export interface FinanceOverview {
  balance: number;
  today: { income: number; expense: number; profit: number; orders: number };
  month: { income: number; expense: number; profit: number; orders: number; avgOrderPrice: number };
  year: { income: number; expense: number; profit: number };
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  balanceAfter: number;
  orderId?: string;
  description?: string;
  remark?: string;
  operator?: string;
  referenceNo: string;
  paymentMethod?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  order?: any;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
}

export interface TrendDataPoint {
  date: string;
  income: number;
  expense: number;
}

export interface CategoryStat {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  icon?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  type: string;
  amount: number;
  status: string;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  issuedAt?: string;
  paidAt?: string;
  dueDate?: string;
  items?: any;
  remark?: string;
  operator?: string;
  createdAt: string;
  updatedAt: string;
  order?: any;
}

export interface MonthlyReport {
  year: number;
  months: Array<{
    month: number;
    income: number;
    expense: number;
    profit: number;
    profitRate: number;
    orderCount: number;
    avgOrderPrice: number;
  }>;
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalProfit: number;
    profitRate: number;
    totalOrders: number;
    avgOrderPrice: number;
  };
}

// 智能财务分析接口
export interface FinanceAnalytics {
  period: string;
  current: {
    income: number;
    expense: number;
    profit: number;
    profitRate: number;
    orderCount: number;
    avgOrderPrice: number;
  };
  comparison: {
    momIncome: number;
    momGrowth: number;
    momOrderCount: number;
    yoyIncome: number;
    yoyGrowth: number;
    yoyOrderCount: number;
    avgOrderPriceChange: number;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  paymentDistribution: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
  peakHours: Array<{
    hour: number;
    orders: number;
    income: number;
  }>;
}

// 订单统计接口
export interface OrderStats {
  period: string;
  totalIncome: number;
  totalOrders: number;
  avgOrderPrice: number;
  dailyTrend: Array<{
    date: string;
    orders: number;
    income: number;
  }>;
}

export const financeAPI = {
  getOverview: () =>
    request<FinanceOverview>('/api/admin/finance/overview'),

  getTransactions: (params?: any) => {
    const sp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'all') sp.set(k, String(v));
    });
    const q = sp.toString();
    return request<any>(`/api/admin/finance/transactions${q ? `?${q}` : ''}`);
  },

  createTransaction: (data: any) =>
    request<Transaction>('/api/admin/finance/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTransaction: (id: string) =>
    request<Transaction>(`/api/admin/finance/transactions/${id}`),

  deleteTransaction: (id: string) =>
    request<{ message: string }>(`/api/admin/finance/transactions/${id}`, {
      method: 'DELETE',
    }),

  exportTransactions: (params?: any) => {
    const sp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'all') sp.set(k, String(v));
    });
    const q = sp.toString();
    return `${API_BASE}/api/admin/finance/transactions/export/csv${q ? `?${q}` : ''}`;
  },

  getCategories: (type?: string) => {
    const q = type ? `?type=${type}` : '';
    return request<FinanceCategory[]>(`/api/admin/finance/categories${q}`);
  },

  getTrend: (params?: any) => {
    const sp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined) sp.set(k, String(v));
    });
    const q = sp.toString();
    return request<TrendDataPoint[]>(`/api/admin/finance/trend${q ? `?${q}` : ''}`);
  },

  getCategoryStats: (params?: any) => {
    const sp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined) sp.set(k, String(v));
    });
    const q = sp.toString();
    return request<{ total: number; list: CategoryStat[] }>(`/api/admin/finance/category-stats${q ? `?${q}` : ''}`);
  },

  getInvoices: (params?: any) => {
    const sp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'all') sp.set(k, String(v));
    });
    const q = sp.toString();
    return request<any>(`/api/admin/finance/invoices${q ? `?${q}` : ''}`);
  },

  createInvoice: (data: any) =>
    request<Invoice>('/api/admin/finance/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getInvoice: (id: string) =>
    request<Invoice>(`/api/admin/finance/invoices/${id}`),

  updateInvoiceStatus: (id: string, status: string, operator?: string) =>
    request<Invoice>(`/api/admin/finance/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, operator }),
    }),

  deleteInvoice: (id: string) =>
    request<{ message: string }>(`/api/admin/finance/invoices/${id}`, {
      method: 'DELETE',
    }),

  getMonthlyReport: (year?: number) => {
    const q = year ? `?year=${year}` : '';
    return request<MonthlyReport>(`/api/admin/finance/report/monthly${q}`);
  },

  exportMonthlyReport: (year?: number) => {
    const q = year ? `?year=${year}` : '';
    return `${API_BASE}/api/admin/finance/report/monthly/export/csv${q}`;
  },

  // 智能财务分析
  getAnalytics: (period?: string) => {
    const q = period ? `?period=${period}` : '';
    return request<FinanceAnalytics>(`/api/admin/finance/analytics${q}`);
  },

  // 订单统计
  getOrderStats: (period?: string) => {
    const q = period ? `?period=${period}` : '';
    return request<OrderStats>(`/api/admin/finance/order-stats${q}`);
  },
};

export function formatPrice(fen: number): string {
  return `¥${(fen / 100).toFixed(2)}`;
}

export function formatPriceShort(fen: number): string {
  const yuan = fen / 100;
  if (yuan >= 10000) return `¥${(yuan / 10000).toFixed(1)}万`;
  if (yuan >= 1000) return `¥${(yuan / 1000).toFixed(1)}k`;
  return `¥${yuan.toFixed(2)}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
