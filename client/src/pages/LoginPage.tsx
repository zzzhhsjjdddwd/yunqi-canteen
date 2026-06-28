import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authLoginRegister } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { ArrowRight, Cloud, Leaf, Mountain } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isLoggedIn, setAuth } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showNickname, setShowNickname] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/menu', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }

    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }

    if (!password) {
      setError('请输入密码');
      return;
    }

    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setLoading(true);

    try {
      const response = await authLoginRegister(
        phone,
        password,
        nickname || undefined
      );
      setAuth(response.user, response.token);

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('show-install-prompt', { detail: { autoHide: true } })
        );
      }, 800);

      navigate('/menu', { replace: true });
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center p-4 safe-top safe-bottom relative overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="bg-blob-1 -top-20 -right-20 animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="bg-blob-2 top-1/2 -left-10 animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
        <div className="bg-blob-3 bottom-10 right-1/4 animate-pulse" style={{ animationDuration: '7s', animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-sm">
        {/* 主卡片 */}
        <div className="glass-card p-8 space-y-8 shimmer-sweep">
          {/* Logo · 青金浮雕徽章 */}
          <div className="text-center space-y-5">
            <div className="relative mx-auto w-24 h-24">
              {/* 外圈金边 */}
              <div className="absolute inset-0 rounded-full gold-border breathe-glow" />
              {/* 徽章主体 */}
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/20 via-background-warm to-accent/20 backdrop-blur-sm flex items-center justify-center border border-white/60 shadow-inner">
                {/* 内部装饰 */}
                <div className="absolute inset-2 rounded-full border border-primary/20" />
                <div className="flex flex-col items-center gap-1">
                  <Cloud className="w-7 h-7 text-primary" strokeWidth={1.5} />
                  <div className="flex items-center gap-0.5">
                    <Mountain className="w-4 h-4 text-primary/70" strokeWidth={1.5} />
                    <Leaf className="w-4 h-4 text-accent" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold gradient-text-gold tracking-wide">云栖浅食</h1>
              <p className="text-sm text-muted-foreground">
                健康轻食，美好一天从这里开始
              </p>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground/80">
                手机号
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="请输入手机号"
                className="w-full px-4 py-3.5 rounded-xl glass-input text-base"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground/80">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码（至少6位）"
                className="w-full px-4 py-3.5 rounded-xl glass-input text-base"
              />
            </div>

            {/* 昵称 - 可选展开 */}
            {showNickname ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground/80">
                  昵称（选填）
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="给自己起个好听的名字"
                  className="w-full px-4 py-3.5 rounded-xl glass-input text-base"
                  maxLength={20}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNickname(true)}
                className="text-sm text-primary hover:text-primary-dark transition-colors"
              >
                + 设置昵称（可选）
              </button>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl glass-button font-medium text-base disabled:opacity-60 flex items-center justify-center gap-2 group touch-min"
            >
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>进入</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* 提示文字 */}
          <p className="text-center text-xs text-muted-foreground">
            首次使用将自动注册，已有账号直接登录
          </p>
        </div>

        {/* 底部装饰 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            登录即表示同意《用户协议》和《隐私政策》
          </p>
        </div>
      </div>
    </div>
  );
}
