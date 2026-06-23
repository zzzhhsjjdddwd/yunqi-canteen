import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, User, MapPin, ShoppingBag, Trash2, Eye, ChevronLeft, ChevronRight, Users as UsersIcon, Loader2, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { AdminUsersPageSkeleton, EmptyState } from '../components/Loading';
import { getUsers, getUserDetail, deleteUser } from '../lib/api';
import { formatDate, formatPrice } from '../lib/utils';

interface UserInfo {
  id: string;
  phone: string;
  nickname?: string;
  avatar?: string;
  createdAt: string;
  orderCount: number;
  addressCount: number;
}

interface UserDetail extends UserInfo {
  addresses: any[];
  recentOrders: any[];
}

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers({ page, limit: 10, search: search || undefined });
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotalUsers(data.total);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleViewUser = async (userId: string) => {
    setUserDetailLoading(true);
    try {
      const data = await getUserDetail(userId);
      setSelectedUser(data);
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
      alert('获取用户详情失败');
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？该操作不可恢复。')) return;
    try {
      await deleteUser(userId);
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('删除用户失败');
    }
  };

  if (loading) {
    return <AdminUsersPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 stagger-fade-in" style={{ animationDelay: '0ms' }}>
        <button onClick={() => navigate('/')} className="glass-card p-2 active:scale-95 transition-transform">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold gradient-text">用户管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理所有注册用户</p>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4 stagger-fade-in" style={{ animationDelay: '60ms' }}>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索手机号或昵称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline" className="rounded-full active:scale-95 transition-transform">
            搜索
          </Button>
        </form>
      </div>

      {/* Users List */}
      <div className="glass-card overflow-hidden stagger-fade-in" style={{ animationDelay: '120ms' }}>
        <div className="p-4 border-b border-white/30">
          <p className="text-sm text-muted-foreground">
            共 {totalUsers} 位用户
          </p>
        </div>

        {users.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={search ? '没有匹配的用户' : '暂无用户'}
            description={search ? '试试其他关键词' : '还没有用户注册'}
          />
        ) : (
          <div className="divide-y divide-white/20">
            {users.map((user, i) => (
              <div
                key={user.id}
                className="p-4 hover:bg-white/30 transition-colors cursor-pointer stagger-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => handleViewUser(user.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold">
                    {user.nickname?.[0] || user.phone[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.nickname || '未设置昵称'}</p>
                      <span className="text-sm text-muted-foreground">{user.phone}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" />
                        {user.orderCount} 订单
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {user.addressCount} 地址
                      </span>
                      <span>注册于 {formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-transform"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-full active:scale-95 transition-transform"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一页
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-full active:scale-95 transition-transform"
            >
              下一页
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="rounded-2xl border-white/50 bg-white/90 backdrop-blur-xl max-w-lg max-h-[80vh] overflow-y-auto pop-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 gradient-text">
              <User className="h-5 w-5 text-primary" />
              用户详情
            </DialogTitle>
          </DialogHeader>

          {userDetailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : selectedUser && (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                    {selectedUser.nickname?.[0] || selectedUser.phone[0]}
                  </div>
                  <div>
                    <p className="font-medium text-lg">{selectedUser.nickname || '未设置昵称'}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      注册于 {formatDate(selectedUser.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 text-center">
                  <ShoppingBag className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                  <p className="text-2xl font-bold gradient-text">{selectedUser.orderCount}</p>
                  <p className="text-xs text-muted-foreground">订单数</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <MapPin className="h-6 w-6 mx-auto text-green-500 mb-2" />
                  <p className="text-2xl font-bold gradient-text">{selectedUser.addressCount}</p>
                  <p className="text-xs text-muted-foreground">收货地址</p>
                </div>
              </div>

              {selectedUser.addresses && selectedUser.addresses.length > 0 && (
                <div className="glass-card p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    收货地址
                  </h4>
                  <div className="space-y-2">
                    {selectedUser.addresses.map((addr: any) => (
                      <div key={addr.id} className="text-sm p-2 bg-white/50 rounded-lg">
                        <p className="font-medium">{addr.name} {addr.phone}</p>
                        <p className="text-muted-foreground text-xs">
                          {addr.province} {addr.city} {addr.district} {addr.detail}
                        </p>
                        {addr.isDefault && (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-xs mt-1">
                            默认
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedUser.recentOrders && selectedUser.recentOrders.length > 0 && (
                <div className="glass-card p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    最近订单
                  </h4>
                  <div className="space-y-2">
                    {selectedUser.recentOrders.map((order: any) => (
                      <div key={order.id} className="text-sm p-2 bg-white/50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{order.orderNo}</span>
                          <span className="font-bold text-primary">{formatPrice(order.total)}</span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-1">
                          {order.items.map((i: any) => i.productName).join(', ')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 rounded-full active:scale-95 transition-transform"
                >
                  关闭
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDeleteUser(selectedUser.id)}
                  className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 active:scale-95 transition-transform"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除用户
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
