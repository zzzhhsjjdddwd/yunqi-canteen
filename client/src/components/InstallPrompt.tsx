import { useState, useEffect, useRef } from 'react';
import { Download, X, Share, Plus, CheckCircle2, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallStatus = 'idle' | 'prompt' | 'success' | 'help';

const AUTO_HIDE_DELAY = 3000; // 3秒自动隐藏

/**
 * PWA 安装提示组件
 *
 * 核心逻辑：
 * - 每次登录成功后显示，3 秒后自动隐藏（不打扰用户）
 * - 用户可手动点击「立即安装」再次唤起
 * - iOS：不支持 beforeinstallprompt，弹出操作指引
 * - Android/桌面：支持浏览器原生一键安装
 * - 安装成功后显示成功提示（2 秒后自动关闭）
 */
export default function InstallPrompt() {
  const [status, setStatus] = useState<InstallStatus>('idle');
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [autoHideTimer, setAutoHideTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [successTimer, setSuccessTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const successShownRef = useRef(false);

  // 检测环境
  useEffect(() => {
    // 检测是否已安装（standalone 模式）
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // 检测 iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua);
    setIsIOS(iOS);
  }, []);

  // 监听 Android 的 beforeinstallprompt 事件
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 监听 appinstalled 事件（Android 安装成功）
  useEffect(() => {
    const handler = () => {
      // 防止重复提示
      if (successShownRef.current) return;
      successShownRef.current = true;

      // 清除自动隐藏计时器
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        setAutoHideTimer(null);
      }

      setStatus('success');
      const t = setTimeout(() => {
        setStatus('idle');
      }, 2500);
      setSuccessTimer(t);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, [autoHideTimer]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoHideTimer) clearTimeout(autoHideTimer);
      if (successTimer) clearTimeout(successTimer);
    };
  }, [autoHideTimer, successTimer]);

  // 暴露给外部调用的方法：通过自定义事件触发显示
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      showPrompt(detail?.autoHide !== false);
    };
    window.addEventListener('show-install-prompt', handler);
    return () => window.removeEventListener('show-install-prompt', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStandalone, deferredPrompt]);

  // 如果已安装，不显示
  if (isStandalone) return null;

  /**
   * 显示安装提示
   * @param autoHide 是否 3 秒后自动隐藏
   */
  const showPrompt = (autoHide: boolean = true) => {
    // 清除已有定时器
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      setAutoHideTimer(null);
    }

    setStatus('prompt');

    if (autoHide) {
      const t = setTimeout(() => {
        setStatus('idle');
        setAutoHideTimer(null);
      }, AUTO_HIDE_DELAY);
      setAutoHideTimer(t);
    }
  };

  /**
   * 点击「立即安装」按钮
   * - Android：有 deferredPrompt，调用浏览器原生安装
   * - iOS：显示操作指引
   */
  const handleInstall = async () => {
    // 清除自动隐藏计时器（用户主动操作了）
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      setAutoHideTimer(null);
    }

    if (deferredPrompt) {
      // Android/桌面：真正的安装
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          // 安装成功提示由 appinstalled 事件处理
        } else {
          // 用户取消，恢复自动隐藏
          setStatus('idle');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install failed:', err);
        setStatus('help');
      }
    } else {
      // iOS 或 Android 兜底：显示操作指引
      setStatus('help');
    }
  };

  /**
   * 关闭提示
   */
  const handleDismiss = () => {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      setAutoHideTimer(null);
    }
    setStatus('idle');
  };

  // 关闭操作指引
  const handleCloseHelp = () => {
    setStatus('idle');
  };

  // ========== 渲染 ==========

  // 安装成功提示
  if (status === 'success') {
    return (
      <div
        className="page-fade-in"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1100,
        }}
      >
        <div
          className="glass-card-static flex items-center gap-3"
          style={{
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            padding: '20px 28px',
            background: 'linear-gradient(135deg, rgba(122,170,148,0.95), rgba(157,186,174,0.95))',
            color: 'white',
          }}
        >
          <CheckCircle2 className="h-8 w-8 flex-shrink-0" />
          <div>
            <p className="font-bold text-base">安装成功！</p>
            <p className="text-sm opacity-90 mt-0.5">云栖浅食已添加到主屏幕</p>
          </div>
        </div>
      </div>
    );
  }

  // 操作指引弹窗
  if (status === 'help') {
    return (
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
        onClick={handleCloseHelp}
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
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #84A896, #9DBAAE)',
                color: 'white',
                boxShadow: '0 4px 14px rgba(132, 168, 150, 0.3)',
              }}
            >
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold gradient-text">
                {isIOS ? 'iOS 安装步骤' : 'Android 安装步骤'}
              </h3>
              <p className="text-xs text-muted-foreground">按以下步骤添加到主屏幕</p>
            </div>
          </div>

          <ol className="space-y-3 text-sm text-foreground mb-5">
            {isIOS ? (
              <>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">1</span>
                  <span className="flex-1 pt-0.5">
                    点击浏览器底部的 <Share className="inline h-4 w-4 text-primary" /> 分享按钮
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">2</span>
                  <span className="flex-1 pt-0.5">
                    在弹出菜单中选择 <Plus className="inline h-4 w-4 text-primary" /> "添加到主屏幕"
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">3</span>
                  <span className="flex-1 pt-0.5">点击右上角"添加"即可</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">1</span>
                  <span className="flex-1 pt-0.5">点击浏览器右上角菜单（三个点）</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">2</span>
                  <span className="flex-1 pt-0.5">选择"添加到主屏幕"或"安装应用"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">3</span>
                  <span className="flex-1 pt-0.5">点击"添加"完成安装</span>
                </li>
              </>
            )}
          </ol>

          <button
            onClick={handleCloseHelp}
            className="glass-button w-full active:scale-95 transition-transform"
          >
            我知道了
          </button>
        </div>
      </div>
    );
  }

  // 主安装提示卡片
  if (status !== 'prompt') return null;

  return (
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
          <div style={{ flex: 1, minWidth: 0 }}>
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
                ? 'iOS 请按提示手动添加到主屏幕'
                : '一键安装到手机，桌面图标点开即用'}
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
                aria-label="关闭"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
