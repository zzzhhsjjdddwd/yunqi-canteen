import { useState, useEffect } from 'react';
import { QrCode, Loader2 } from 'lucide-react';
import { getPaymentQR } from '../lib/api';

export default function PaymentQRCard() {
  const [paymentQR, setPaymentQR] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQR() {
      try {
        const data = await getPaymentQR();
        setPaymentQR(data.paymentQR);
      } catch (error) {
        console.error('Failed to fetch payment QR:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchQR();
  }, []);

  if (loading) {
    return (
      <div className="mx-4 mt-4">
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/15 to-primary/20 rounded-[1.4rem] blur-xl opacity-60" />
          <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(91,163,163,0.12),0_2px_8px_rgba(201,169,110,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="relative p-6 flex flex-col items-center justify-center min-h-[280px]">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">加载中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentQR) {
    return (
      <div className="mx-4 mt-4">
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/15 to-primary/20 rounded-[1.4rem] blur-xl opacity-60" />
          <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(91,163,163,0.12),0_2px_8px_rgba(201,169,110,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="relative p-6 flex flex-col items-center justify-center min-h-[280px]">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/20 flex items-center justify-center mb-4">
                <QrCode className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">添加微信付款</h3>
              <p className="text-sm text-muted-foreground text-center">
                商家暂未设置收款码<br />
                请稍后再试
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4">
      <div className="relative group">
        {/* 外层光晕 */}
        <div className="absolute -inset-2 bg-gradient-to-r from-green-500/20 via-emerald-400/15 to-green-500/20 rounded-[1.4rem] blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        
        {/* 主卡片 */}
        <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-2xl border border-green-200/50 shadow-[0_8px_32px_rgba(34,197,94,0.15),0_2px_8px_rgba(34,197,94,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] select-none">
          {/* 动态渐变背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/80 via-emerald-50/50 to-green-100/60" />
          
          {/* 装饰性圆形光斑 */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-green-400/20 to-transparent blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-400/15 to-transparent blur-xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          
          {/* 顶部高光线 */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-green-200/60 to-transparent" />
          
          {/* 内容区域 */}
          <div className="relative p-6 flex flex-col items-center">
            {/* 标题 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                <QrCode className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-green-700">添加微信付款</h2>
            </div>
            
            {/* 二维码图片 - 支持系统原生长按保存 */}
            <div className="relative mb-4">
              {/* 二维码背景装饰 */}
              <div className="absolute -inset-3 bg-gradient-to-br from-green-100/50 to-emerald-100/40 rounded-3xl blur-sm" />
              <div className="relative bg-white p-3 rounded-2xl shadow-lg shadow-green-500/10 border border-green-100">
                <img 
                  src={paymentQR}
                  alt="收款二维码"
                  className="w-48 h-48 object-contain rounded-xl"
                  style={{ 
                    WebkitTouchCallout: 'default',
                    touchAction: 'manipulation',
                    userSelect: 'none',
                    pointerEvents: 'auto',
                  }}
                  draggable={false}
                />
              </div>
              
              {/* 长按提示 */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-green-600/80 whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>长按保存到相册</span>
              </div>
            </div>
            
            {/* 提示信息 */}
            <p className="text-sm text-green-600/80 font-medium mt-8">
              识别二维码 → 添加商家微信 → 转账付款
            </p>
          </div>
          
          {/* 底部装饰线 */}
          <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-green-200/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}
