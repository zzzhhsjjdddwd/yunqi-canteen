import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Cloud, Leaf, Mountain, Loader2 } from 'lucide-react';
import { login } from '../lib/api';
import { useAdminStore } from '../stores/adminStore';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: storeLogin } = useAdminStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await login(username, password);
      storeLogin(data.token, data.admin);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="bg-blob-1 -top-40 -right-40" />
        <div className="bg-blob-2 top-1/3 -left-20" />
        <div className="bg-blob-3 bottom-20 right-10" />
      </div>

      <div className="glass-card w-full max-w-md p-8 shimmer-sweep">
        <div className="text-center mb-8">
          {/* Logo · 青金浮雕徽章 */}
          <div className="relative mx-auto w-20 h-20 mb-4">
            <div className="absolute inset-0 rounded-full gold-border breathe-glow" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/20 via-background-warm to-accent/20 backdrop-blur-sm flex items-center justify-center border border-white/60 shadow-inner">
              <div className="absolute inset-2 rounded-full border border-primary/20" />
              <div className="flex flex-col items-center gap-0.5">
                <Cloud className="w-6 h-6 text-primary" strokeWidth={1.5} />
                <div className="flex items-center gap-px">
                  <Mountain className="w-3.5 h-3.5 text-primary/70" strokeWidth={1.5} />
                  <Leaf className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold gradient-text-gold tracking-wide">商家登录</h1>
          <p className="mt-2 text-sm text-muted-foreground">云栖浅食 · 智能点餐管理系统</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="glass-card rounded-xl bg-destructive/10 border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">用户名</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
              className="glass-input"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              className="glass-input"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="glass-button w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                登录中...
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                登录
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>云栖浅食 · 智能点餐管理系统</p>
        </div>
      </div>
    </div>
  );
}
