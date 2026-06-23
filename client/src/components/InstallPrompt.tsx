import { useState, useEffect } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';

// PWA安装提示 - 检测并提示用户将应用添加到主屏幕
// 优化：3秒延迟、统一文案、Lucide 图标、动画
export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    // 检测是否已安装 (standalone mode)
    const isStandAlone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(isStandAlone);

    if (isStandAlone || dismissed) {
      return;
    }

    // 读取本地存储：若用户 7 天内关闭过，不再提示
    const dismissedAt = localStorage.getItem('pwa-install-dismissed-at');
    if (dismissedAt) {
      const ts = Number(dismissedAt);
      if (Number.isFinite(ts) && Date.now() - ts < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // iOS检测
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // Android/Chrome - 监听 beforeinstallprompt
    const beforeInstallHandler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // 优化：首次进入主菜单 3 秒后弹出引导
      setTimeout(() => {
        if (!dismissed) setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallHandler);

    // iOS Safari - 用户浏览 3 秒后提示
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        if (!dismissed) setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Android 兜底：3 秒后也提示
    if (!isIOSDevice && !deferredPrompt) {
      const timer = setTimeout(() => {
        if (!dismissed && !isStandAlone) setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
    };
  }, [dismissed]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      return;
    }

    // iOS - 弹出操作指引
    if (isIOS) {
      setShowIOSHelp(true);
    } else {
      // Android fallback
      setShowIOSHelp(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    // 记录到 localStorage，7 天内不再提示
    localStorage.setItem('pwa-install-dismissed-at', String(Date.now()));
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <>
      <div
        className="page-fade-in"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          maxWidth: '360px',
          width: '90%',
        }}
      >
        <div
          className="glass-card-static"
          style={{
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            padding: '16px',
            border: '1px solid rgba(132, 168, 150, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #84A896, #9DBAAE)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(132, 168, 150, 0.3)',
              }}
            >
              <Download className="h-6 w-6" />
            </div>
            <div style={{ flex: 1 }}>
              <h4
                style={{
                  margin: 0,
                  marginBottom: '4px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#3D3D3B',
                }}
              >
                添加到主屏幕
              </h4>
              <p
                style={{
                  margin: 0,
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#8A8A87',
                  lineHeight: 1.5,
                }}
              >
                {isIOS
                  ? '将云栖浅食添加到主屏幕，享受原生App体验，点餐更快'
                  : '一键安装云栖浅食到手机，桌面图标点开即用'}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleInstall}
                  className="glass-button active:scale-95 transition-transform"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  {isIOS ? '查看安装方法' : '立即安装'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="active:scale-95 transition-all"
                  style={{
                    padding: '10px 12px',
                    background: 'transparent',
                    color: '#8A8A87',
                    border: '1px solid #E5E7EB',
                    borderRadius: '9999px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  稍后
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* iOS / Android 操作指引弹窗 */}
      {showIOSHelp && (
        <div
          className="page-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
            padding: '20px',
          }}
          onClick={() => setShowIOSHelp(false)}
        >
          <div
            className="glass-card-static"
            style={{
              maxWidth: '340px',
              width: '100%',
              borderRadius: '20px',
              padding: '24px',
              background: 'rgba(255,255,255,0.96)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="gradient-text text-lg font-bold mb-3">
              {isIOS ? 'iOS 安装步骤' : 'Android 安装步骤'}
            </h3>
            <ol className="space-y-3 text-sm text-foreground mb-5">
              {isIOS ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">1</span>
                    <span>点击浏览器底部的 <Share className="inline h-4 w-4 text-primary" /> 分享按钮</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">2</span>
                    <span>在弹出菜单中选择 <Plus className="inline h-4 w-4 text-primary" /> "添加到主屏幕"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">3</span>
                    <span>点击右上角"添加"即可</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">1</span>
                    <span>点击浏览器右上角菜单 (三个点)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">2</span>
                    <span>选择"添加到主屏幕"或"安装应用"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">3</span>
                    <span>点击"添加"完成安装</span>
                  </li>
                </>
              )}
            </ol>
            <button
              onClick={() => setShowIOSHelp(false)}
              className="glass-button w-full active:scale-95 transition-transform"
              style={{ width: '100%' }}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
