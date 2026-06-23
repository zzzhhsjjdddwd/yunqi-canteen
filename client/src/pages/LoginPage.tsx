import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(phone, password);
      setAuth(response.user, response.token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-purple-50/30 to-blue-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold gradient-text mb-2">欢迎回来</h1>
            <p className="text-sm text-muted-foreground">登录您的账号</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="w-full px-4 py-3 rounded-xl glass-input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 rounded-xl glass-input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl glass-button font-medium disabled:opacity-60"
            >
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              还没有账号？{' '}
              <Link to="/register" className="text-primary font-medium hover:underline">
                立即注册
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              先逛逛
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
