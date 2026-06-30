import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, QrCode, CreditCard, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { useOrderStore } from '../stores/orderStore';
import { onPaymentConfirm } from '../lib/socket';
import { getOrder } from '../lib/api';
import type { PaymentConfirmData } from '../../../shared/types';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNo: string;
}

export default function PaymentModal({ open, onClose, orderId, orderNo }: PaymentModalProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [imageError, setImageError] = useState(false);
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);

  const qrUrl = '/wechat-qr.jpg';

  useEffect(() => {
    if (open) {
      setImageError(false);
    }
  }, [open]);

  useEffect(() => {
    const unsubscribe = onPaymentConfirm((data: PaymentConfirmData) => {
      if (data.orderId === orderId) {
        setStatus(data.status === 'success' ? 'success' : 'failed');
        if (data.status === 'success') {
          updateOrderStatus(orderId, 'paid');
        }
      }
    });

    return () => unsubscribe();
  }, [orderId, updateOrderStatus]);

  // Fallback: 每 1.5s 轮询一次订单状态，防止 socket 未连接/事件丢失
  useEffect(() => {
    if (!open) return;
    if (status !== 'pending') return;
    const interval = setInterval(async () => {
      try {
        const order = await getOrder(orderId);
        if (order.paymentStatus === 'paid' || order.status === 'paid') {
          setStatus('success');
          updateOrderStatus(orderId, 'paid');
        } else if (order.paymentStatus === 'cancelled' || order.status === 'cancelled') {
          setStatus('failed');
        } else if (order.paymentStatus === 'failed') {
          setStatus('failed');
        }
      } catch (err) {
        // 静默失败，等下一轮再试
        console.warn('Polling order status failed:', err);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [open, orderId, status, updateOrderStatus]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl border-white/50 bg-white/90 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 gradient-text">
            <CreditCard className="h-5 w-5 text-primary" />
            扫码支付
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            订单号：<span className="font-medium">{orderNo}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {status === 'pending' && (
            <>
              <div className="glass-card relative p-4">
                {!imageError ? (
                  <img
                    src={qrUrl}
                    alt="收款二维码"
                    className="h-56 w-56 rounded-xl"
                    style={{ 
                      WebkitTouchCallout: 'default',
                      touchAction: 'manipulation',
                    }}
                    onError={() => setImageError(true)}
                    draggable={false}
                  />
                ) : (
                  <div className="h-56 w-56 flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-green-50 to-emerald-50">
                    <QrCode className="h-16 w-16 text-green-400 mb-3" />
                    <p className="text-sm text-green-600/70 font-medium">二维码加载中</p>
                    <p className="text-xs text-green-600/50 mt-1">请稍后重试</p>
                  </div>
                )}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 backdrop-blur-sm shadow-lg">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <QrCode className="h-3 w-3" />
                    长按识别二维码
                  </p>
                </div>
              </div>
              <div className="glass-card flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-light">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">等待支付结果...</span>
              </div>
            </>
          )}

          {status === 'success' && (
            <div className="glass-card flex flex-col items-center gap-6 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-500 shadow-xl shadow-green-500/40">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold gradient-text">订单提交成功</h3>
                <p className="mt-2 text-sm text-muted-foreground">感谢您的支持，请扫码支付</p>
              </div>
              <div className="flex gap-3 w-full">
                <Button onClick={() => {
                  onClose();
                  navigate('/menu');
                }} variant="outline" className="flex-1 rounded-full bg-white/60 backdrop-blur-sm">
                  返回首页
                </Button>
                <Button onClick={() => {
                  onClose();
                  navigate(`/menu/orders/${orderId}`);
                }} className="flex-1 glass-button">
                  <Sparkles className="h-4 w-4 mr-2" />
                  查看订单
                </Button>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="glass-card flex flex-col items-center gap-6 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-500 shadow-xl shadow-red-500/40">
                <XCircle className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-600">支付失败</h3>
                <p className="mt-2 text-sm text-muted-foreground">请重新下单或联系商家</p>
              </div>
              <Button 
                onClick={onClose} 
                className="w-full rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all"
              >
                关闭
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}