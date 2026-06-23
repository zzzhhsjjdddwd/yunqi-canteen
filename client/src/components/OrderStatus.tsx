import { Clock, ChefHat, XCircle, CreditCard, CheckCheck } from 'lucide-react';
import type { Order } from '../../../shared/types';

interface OrderStatusProps {
  status: Order['status'];
  paymentStatus: Order['paymentStatus'];
}

const statusConfig: Record<Order['status'], { label: string; description: string; icon: any; color: string; bgClass: string }> = {
  pending: {
    label: '待处理',
    description: '等待商家确认订单',
    icon: Clock,
    color: 'text-amber-600',
    bgClass: 'status-badge-pending',
  },
  paid: {
    label: '已支付',
    description: '支付成功，等待商家开始制作',
    icon: CreditCard,
    color: 'text-emerald-600',
    bgClass: 'status-badge-pending',
  },
  making: {
    label: '制作中',
    description: '商家正在为您准备美食',
    icon: ChefHat,
    color: 'text-blue-600',
    bgClass: 'status-badge-preparing',
  },
  completed: {
    label: '已完成',
    description: '订单已完成，感谢您的惠顾',
    icon: CheckCheck,
    color: 'text-green-600',
    bgClass: 'status-badge-completed',
  },
  cancelled: {
    label: '已取消',
    description: '订单已取消',
    icon: XCircle,
    color: 'text-red-600',
    bgClass: 'status-badge-cancelled',
  },
};

export default function OrderStatus({ status, paymentStatus }: OrderStatusProps) {
  // 未支付状态
  if (paymentStatus === 'unpaid' && status === 'pending') {
    return (
      <div className="glass-card flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-500/30">
          <CreditCard className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="font-semibold text-amber-700">等待支付</p>
          <p className="text-sm text-muted-foreground">请完成支付后等待商家确认</p>
        </div>
        <div className="ml-auto">
          <span className="status-badge status-badge-pending">
            <Clock className="h-3 w-3" />
            待支付
          </span>
        </div>
      </div>
    );
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="glass-card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg ${
        status === 'pending' ? 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-500/30' :
        status === 'paid' ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-emerald-500/30' :
        status === 'making' ? 'bg-gradient-to-br from-blue-400 to-blue-500 shadow-blue-500/30' :
        status === 'completed' ? 'bg-gradient-to-br from-green-400 to-green-500 shadow-green-500/30' :
        'bg-gradient-to-br from-red-400 to-red-500 shadow-red-500/30'
      }`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className={`font-semibold ${config.color}`}>{config.label}</p>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>
      <div className="ml-auto">
        <span className={`status-badge ${config.bgClass}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}
