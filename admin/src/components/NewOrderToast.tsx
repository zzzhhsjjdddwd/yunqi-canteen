import { useState, useEffect } from 'react';
import { X, ShoppingCart, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NewOrderData } from '../../../shared/types';

interface NewOrderToastProps {
  order: NewOrderData;
  onClose: () => void;
}

export default function NewOrderToast({ order, onClose }: NewOrderToastProps) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const handleViewOrder = () => {
    navigate('/orders');
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const totalYuan = (order.total / 100).toFixed(2);

  return (
    <div
      className={`fixed top-4 right-4 z-50 w-80 transform transition-all duration-300 ease-out ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

        <div className="relative p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">新订单来了</h3>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {order.items.length} 件
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground truncate">
                订单号：{order.orderNo}
              </p>
            </div>

            <button
              onClick={() => {
                setVisible(false);
                setTimeout(onClose, 300);
              }}
              className="p-1 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">订单金额</p>
              <p className="text-lg font-bold gradient-text-gold">¥{totalYuan}</p>
            </div>

            <button
              onClick={handleViewOrder}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-200"
            >
              <Eye className="h-4 w-4" />
              查看
            </button>
          </div>

          {order.remark && (
            <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">备注：{order.remark}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
