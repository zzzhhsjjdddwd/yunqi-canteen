import { useEffect, useState } from 'react';
import { financeAPI, formatPrice, formatDateTime } from '../api/finance';

const InvoicesPage = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [newInvoice, setNewInvoice] = useState({
    type: 'sale',
    amount: '',
    customerName: '',
    customerPhone: '',
    remark: '',
    dueDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [page, typeFilter, statusFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const result = await financeAPI.getInvoices({
        page,
        pageSize,
        type: typeFilter,
        status: statusFilter,
        search: search || undefined,
      });
      setInvoices(result.list || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Load invoices error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1);
      loadInvoices();
    }
  };

  const handleSubmit = async () => {
    if (!newInvoice.amount || parseFloat(newInvoice.amount) <= 0) {
      alert('请填写正确的金额');
      return;
    }
    setSubmitting(true);
    try {
      await financeAPI.createInvoice({
        ...newInvoice,
        amount: Math.round(parseFloat(newInvoice.amount) * 100),
      });
      setShowAddDialog(false);
      setNewInvoice({ type: 'sale', amount: '', customerName: '', customerPhone: '', remark: '', dueDate: '' });
      loadInvoices();
    } catch (error) {
      console.error('Create invoice error:', error);
      alert('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!confirm(`确定要${status === 'paid' ? '标记为已支付' : status === 'cancelled' ? '取消' : '退款'}此账单吗？`)) return;
    try {
      await financeAPI.updateInvoiceStatus(id, status, 'admin');
      loadInvoices();
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    } catch (error) {
      console.error('Update invoice error:', error);
      alert('操作失败，请重试');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('确定要删除这个账单吗？删除后无法恢复。')) return;
    try {
      await financeAPI.deleteInvoice(id);
      loadInvoices();
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    } catch (error) {
      console.error('Delete invoice error:', error);
      alert('删除失败，请重试');
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = { sale: '销售账单', expense: '支出账单', refund: '退款账单' };
    return map[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { unpaid: '未支付', paid: '已支付', cancelled: '已取消', refunded: '已退款' };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-success/10 text-success';
      case 'unpaid': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      case 'refunded': return 'bg-error/10 text-error';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text-gold">账单管理</h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 条账单</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-5 py-2.5 rounded-xl glass-button text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建账单
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/40">
            {['all', 'sale', 'expense', 'refund'].map(t => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setPage(1); }}
                className={`px-4 py-1.5 rounded-lg text-sm transition-all ${typeFilter === t ? 'bg-white shadow-sm font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t === 'all' ? '全部' : getTypeLabel(t)}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">全部状态</option>
            <option value="unpaid">未支付</option>
            <option value="paid">已支付</option>
            <option value="cancelled">已取消</option>
            <option value="refunded">已退款</option>
          </select>

          <div className="flex-1" />

          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="搜索账单号/客户名/电话..."
              className="w-64 pl-10 pr-4 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>
      </div>

      {/* 账单列表 */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">加载中...</div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-muted-foreground">暂无账单</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">账单号</th>
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">类型</th>
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">客户</th>
                    <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">金额</th>
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">状态</th>
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">开票日期</th>
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-white/5 hover:bg-white/30 transition-colors">
                      <td className="py-4 px-5">
                        <span className="font-mono text-sm font-medium cursor-pointer hover:text-primary" onClick={() => setSelectedInvoice(inv)}>
                          {inv.invoiceNo}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          inv.type === 'sale' ? 'bg-success/10 text-success' :
                          inv.type === 'expense' ? 'bg-error/10 text-error' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {getTypeLabel(inv.type)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm">
                        {inv.customerName || '-'}
                        {inv.customerPhone && <span className="text-muted-foreground ml-2">{inv.customerPhone}</span>}
                      </td>
                      <td className={`py-4 px-5 text-right font-semibold text-sm ${inv.type === 'sale' ? 'text-success' : 'text-error'}`}>
                        {inv.type === 'sale' ? '+' : '-'}{formatPrice(inv.amount)}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                          {getStatusLabel(inv.status)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm text-muted-foreground">
                        {inv.issuedAt ? formatDateTime(inv.issuedAt) : '-'}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="text-xs text-primary hover:underline"
                          >
                            详情
                          </button>
                          {inv.status === 'unpaid' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(inv.id, 'paid')}
                                className="text-xs text-success hover:underline"
                              >
                                收款
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(inv.id, 'cancelled')}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                取消
                              </button>
                            </>
                          )}
                          {inv.status === 'paid' && inv.type === 'sale' && (
                            <button
                              onClick={() => handleUpdateStatus(inv.id, 'refunded')}
                              className="text-xs text-error hover:underline"
                            >
                              退款
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="text-xs text-destructive hover:underline"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
                <div className="text-sm text-muted-foreground">第 {page} / {totalPages} 页</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg bg-white/40 text-sm hover:bg-white/60 disabled:opacity-50 flex items-center justify-center"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg bg-white/40 text-sm hover:bg-white/60 disabled:opacity-50 flex items-center justify-center"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 新建账单弹窗 */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddDialog(false)}>
          <div className="w-full max-w-md rounded-2xl border-white/50 bg-white/95 backdrop-blur-xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-5">新建账单</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-1 rounded-xl bg-white/60">
                {['sale', 'expense'].map(t => (
                  <button
                    key={t}
                    onClick={() => setNewInvoice({ ...newInvoice, type: t })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${newInvoice.type === t ? (t === 'sale' ? 'bg-success/20 text-success' : 'bg-error/20 text-error') : 'text-muted-foreground'}`}
                  >
                    {getTypeLabel(t)}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">金额（元）</label>
                <input
                  type="number"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">客户名称</label>
                <input
                  type="text"
                  value={newInvoice.customerName}
                  onChange={(e) => setNewInvoice({ ...newInvoice, customerName: e.target.value })}
                  placeholder="可选"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">联系电话</label>
                <input
                  type="tel"
                  value={newInvoice.customerPhone}
                  onChange={(e) => setNewInvoice({ ...newInvoice, customerPhone: e.target.value })}
                  placeholder="可选"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">到期日期</label>
                <input
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">备注</label>
                <textarea
                  value={newInvoice.remark}
                  onChange={(e) => setNewInvoice({ ...newInvoice, remark: e.target.value })}
                  placeholder="可选"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
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
                {submitting ? '创建中...' : '创建账单'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 账单详情弹窗 */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedInvoice(null)}>
          <div className="w-full max-w-lg rounded-2xl border-white/50 bg-white/95 backdrop-blur-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">账单详情</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-muted-foreground hover:text-foreground">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="text-sm text-muted-foreground mb-1">账单金额</div>
              <div className={`text-4xl font-bold ${selectedInvoice.type === 'sale' ? 'text-success' : 'text-error'}`}>
                {selectedInvoice.type === 'sale' ? '+' : '-'}{formatPrice(selectedInvoice.amount)}
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm mt-3 ${getStatusColor(selectedInvoice.status)}`}>
                {getStatusLabel(selectedInvoice.status)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between py-2.5 border-b border-white/10">
                <span className="text-sm text-muted-foreground">账单号</span>
                <span className="text-sm font-mono">{selectedInvoice.invoiceNo}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-white/10">
                <span className="text-sm text-muted-foreground">账单类型</span>
                <span className="text-sm">{getTypeLabel(selectedInvoice.type)}</span>
              </div>
              {selectedInvoice.customerName && (
                <div className="flex items-center justify-between py-2.5 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">客户名称</span>
                  <span className="text-sm">{selectedInvoice.customerName}</span>
                </div>
              )}
              {selectedInvoice.customerPhone && (
                <div className="flex items-center justify-between py-2.5 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">联系电话</span>
                  <span className="text-sm">{selectedInvoice.customerPhone}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2.5 border-b border-white/10">
                <span className="text-sm text-muted-foreground">开票日期</span>
                <span className="text-sm">{selectedInvoice.issuedAt ? formatDateTime(selectedInvoice.issuedAt) : '-'}</span>
              </div>
              {selectedInvoice.paidAt && (
                <div className="flex items-center justify-between py-2.5 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">支付时间</span>
                  <span className="text-sm">{formatDateTime(selectedInvoice.paidAt)}</span>
                </div>
              )}
              {selectedInvoice.dueDate && (
                <div className="flex items-center justify-between py-2.5 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">到期日期</span>
                  <span className="text-sm">{formatDateTime(selectedInvoice.dueDate)}</span>
                </div>
              )}
              {selectedInvoice.remark && (
                <div className="py-2.5 border-b border-white/10">
                  <span className="text-sm text-muted-foreground block mb-1">备注</span>
                  <span className="text-sm">{selectedInvoice.remark}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">创建时间</span>
                <span className="text-sm">{formatDateTime(selectedInvoice.createdAt)}</span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm font-medium hover:bg-white/80"
              >
                关闭
              </button>
              {selectedInvoice.status === 'unpaid' && (
                <button
                  onClick={() => handleUpdateStatus(selectedInvoice.id, 'paid')}
                  className="flex-1 py-2.5 rounded-xl glass-button text-sm font-medium"
                >
                  确认收款
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
