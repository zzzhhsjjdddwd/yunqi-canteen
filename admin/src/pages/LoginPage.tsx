import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, Loader2 } from 'lucide-react';
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
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-60 w-60 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-40 w-40 rounded-full bg-primary-light/20 blur-2xl" />
      </div>

      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light shadow-xl shadow-primary/40">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">商家登录</h1>
          <p className="mt-2 text-sm text-muted-foreground">请输入您的账号信息</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="glass-card rounded-xl bg-destructive/10 border-destructive/30 p-4 text-sm text-destructive flex items-center gap-2">
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