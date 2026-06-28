import { useEffect, useState } from 'react';
import { financeAPI, formatPrice, formatDateTime } from '../api/finance';

const TransactionsPage = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  const [newTx, setNewTx] = useState({
    type: 'income',
    category: '',
    amount: '',
    description: '',
    remark: '',
    paymentMethod: 'cash',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
    loadTransactions();
  }, [page, typeFilter, categoryFilter, statusFilter]);

  const loadCategories = async () => {
    try {
      const cats = await financeAPI.getCategories();
      setCategories(cats);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const result = await financeAPI.getTransactions({
        page,
        pageSize,
        type: typeFilter,
        category: categoryFilter,
        status: statusFilter,
        search: search || undefined,
      });
      setTransactions(result.list || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Load transactions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1);
      loadTransactions();
    }
  };

  const handleSubmit = async () => {
    if (!newTx.category || !newTx.amount) {
      alert('请填写完整信息');
      return;
    }
    setSubmitting(true);
    try {
      await financeAPI.createTransaction({
        ...newTx,
        amount: Math.round(parseFloat(newTx.amount) * 100),
      });
      setShowAddDialog(false);
      setNewTx({ type: 'income', category: '', amount: '', description: '', remark: '', paymentMethod: 'cash' });
      loadTransactions();
    } catch (error) {
      console.error('Create transaction error:', error);
      alert('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === newTx.type);

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = { income: '收入', expense: '支出', transfer: '转账' };
    return map[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { completed: '已完成', pending: '处理中', failed: '失败', cancelled: '已取消' };
    return map[status] || status;
  };

  const getTypeIcon = (type: string, _category: string) => {
    const isIncome = type === 'income';
    return (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isIncome ? 'bg-success/10' : 'bg-error/10'}`}>
        <svg className={`w-5 h-5 ${isIncome ? 'text-success' : 'text-error'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isIncome ? (
            <path d="M12 19V5M5 12l7-7 7 7" />
          ) : (
            <path d="M12 5v14M5 12l7 7 7-7" />
          )}
        </svg>
      </div>
    );
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text-gold">收支明细</h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 条记录</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-5 py-2.5 rounded-xl glass-button text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新增记录
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/40">
            {['all', 'income', 'expense'].map(t => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setPage(1); setCategoryFilter('all'); }}
                className={`px-4 py-1.5 rounded-lg text-sm transition-all ${typeFilter === t ? 'bg-white shadow-sm font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t === 'all' ? '全部' : t === 'income' ? '收入' : '支出'}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">全部分类</option>
            {categories.filter(c => typeFilter === 'all' || c.type === typeFilter).map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">全部状态</option>
            <option value="completed">已完成</option>
            <option value="pending">处理中</option>
            <option value="failed">失败</option>
            <option value="cancelled">已取消</option>
          </select>

          <div className="flex-1" />

          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="搜索描述/备注/流水号..."
              className="w-64 pl-10 pr-4 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>
      </div>

      {/* 交易列表 */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">加载中...</div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <p className="text-muted-foreground">暂无交易记录</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">交易</th>
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">分类</th>
                    <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">金额</th>
                    <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">余额</th>
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">状态</th>
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-white/5 hover:bg-white/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(tx.type, tx.category)}
                          <div>
                            <div className="font-medium text-sm">{tx.description || tx.category}</div>
                            <div className="text-xs text-muted-foreground font-mono">{tx.referenceNo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/60 border border-white/40">
                          {tx.category}
                        </span>
                      </td>
                      <td className={`py-4 px-5 text-right font-semibold text-sm ${tx.type === 'income' ? 'text-success' : 'text-error'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatPrice(tx.amount)}
                      </td>
                      <td className="py-4 px-5 text-right text-sm text-muted-foreground">
                        {formatPrice(tx.balanceAfter)}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'completed' ? 'bg-success/10 text-success' :
                          tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          tx.status === 'failed' ? 'bg-error/10 text-error' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {getStatusLabel(tx.status)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm text-muted-foreground">
                        {formatDateTime(tx.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
                <div className="text-sm text-muted-foreground">
                  第 {page} / {totalPages} 页
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg bg-white/40 text-sm hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm ${page === p ? 'bg-primary text-white' : 'bg-white/40 hover:bg-white/60'}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg bg-white/40 text-sm hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 新增交易弹窗 */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddDialog(false)}>
          <div className="w-full max-w-md rounded-2xl border-white/50 bg-white/95 backdrop-blur-xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-5">新增交易记录</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-1 rounded-xl bg-white/60">
                {['income', 'expense'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setNewTx({ ...newTx, type: t, category: '' }); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newTx.type === t ? (t === 'income' ? 'bg-success/20 text-success' : 'bg-error/20 text-error') : 'text-muted-foreground'}`}
                  >
                    {t === 'income' ? '收入' : '支出'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">分类</label>
                <select
                  value={newTx.category}
                  onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">请选择分类</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">金额（元）</label>
                <input
                  type="number"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">描述</label>
                <input
                  type="text"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  placeholder="交易描述"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">备注</label>
                <textarea
                  value={newTx.remark}
                  onChange={(e) => setNewTx({ ...newTx, remark: e.target.value })}
                  placeholder="可选"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">支付方式</label>
                <select
                  value={newTx.paymentMethod}
                  onChange={(e) => setNewTx({ ...newTx, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="cash">现金</option>
                  <option value="wechat">微信</option>
                  <option value="alipay">支付宝</option>
                  <option value="bank">银行转账</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm font-medium hover:bg-white/80"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl glass-button text-sm font-medium disabled:opacity-50"
              >
                {submitting ? '提交中...' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 交易详情弹窗 */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTx(null)}>
          <div className="w-full max-w-md rounded-2xl border-white/50 bg-white/95 backdrop-blur-xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">交易详情</h3>
              <button onClick={() => setSelectedTx(null)} className="text-muted-foreground hover:text-foreground">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-sm text-muted-foreground">流水号</span>
                <span className="text-sm font-mono">{selectedTx.referenceNo}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-sm text-muted-foreground">类型</span>
                <span className="text-sm">{getTypeLabel(selectedTx.type)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-sm text-muted-foreground">分类</span>
                <span className="text-sm">{selectedTx.category}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-sm text-muted-foreground">金额</span>
                <span className={`text-lg font-bold ${selectedTx.type === 'income' ? 'text-success' : 'text-error'}`}>
                  {selectedTx.type === 'income' ? '+' : '-'}{formatPrice(selectedTx.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-sm text-muted-foreground">交易后余额</span>
                <span className="text-sm font-medium">{formatPrice(selectedTx.balanceAfter)}</span>
              </div>
              {selectedTx.description && (
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">描述</span>
                  <span className="text-sm">{selectedTx.description}</span>
                </div>
              )}
              {selectedTx.remark && (
                <div className="py-2 border-b border-white/10">
                  <span className="text-sm text-muted-foreground block mb-1">备注</span>
                  <span className="text-sm">{selectedTx.remark}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-sm text-muted-foreground">状态</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedTx.status === 'completed' ? 'bg-success/10 text-success' :
                  selectedTx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {getStatusLabel(selectedTx.status)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">时间</span>
                <span className="text-sm">{formatDateTime(selectedTx.createdAt)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full mt-6 py-2.5 rounded-xl glass-button text-sm font-medium"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
