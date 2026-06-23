import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setLoading(true);

    try {
      const response = await register(phone, password, nickname || undefined);
      setAuth(response.user, response.token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-purple-50/30 to-blue-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold gradient-text mb-2">注册账号</h1>
            <p className="text-sm text-muted-foreground">加入云栖浅食</p>
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
              <label className="block text-sm font-medium mb-2">昵称（选填）</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="给自己起个名字"
                className="w-full px-4 py-3 rounded-xl glass-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码（至少6位）"
                className="w-full px-4 py-3 rounded-xl glass-input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
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
                '注册'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              已有账号？{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                立即登录
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
