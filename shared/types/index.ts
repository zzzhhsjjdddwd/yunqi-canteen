// 云栖浅食 - 共享类型定义
// 用于客户端、管理端、服务端之间的通用数据类型

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  categoryId: string;
  category?: Category;
  sortOrder: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  createdAt?: string;
}

export type OrderStatus = 'pending' | 'paid' | 'making' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface OrderAddress {
  id: string;
  name: string;
  phone: string;
  province?: string;
  city?: string;
  district?: string;
  detail?: string;
}

export interface OrderUser {
  id: string;
  nickname?: string;
  phone: string;
  avatar?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  user?: OrderUser;
  address?: OrderAddress;
  items: OrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  remark?: string;
}

export interface CreateOrderRequest {
  items: Array<{ productId: string; productName: string; price: number; quantity: number }>;
  total: number;
  remark?: string;
  userId?: string;
  addressId?: string;
}

export interface User {
  id: string;
  phone: string;
  nickname?: string;
  avatar?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PaymentConfirmData {
  orderId: string;
  status: 'success' | 'failed';
}

export interface OrderStatusUpdateData {
  orderId: string;
  status: OrderStatus;
}

export interface NewOrderData {
  orderId: string;
  orderNo: string;
  total: number;
  userName?: string;
  userPhone?: string;
  items: OrderItem[];
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  autoConfirmPayment: boolean;
  notifyNewOrders: boolean;
  speakerVolume: number;
  speakerEnabled: boolean;
  speakerNewOrderText: string;
  speakerPaymentFailedText: string;
}

export interface StatsData {
  totalOrders: number;
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  totalUsers: number;
  totalProducts: number;
  weeklyRevenue: number[];
  topProducts: Array<{ name: string; count: number; revenue: number }>;
}
