import { useEffect, useState, useMemo } from 'react';
import { financeAPI, formatPrice, formatDateTime } from '../api/finance';
import { useToast } from '../components/ui/Toast';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

const InvoicesPage = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

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
  }, [page, typeFilter, statusFilter, startDate, endDate]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const result = await financeAPI.getInvoices({
        page,
        pageSize,
        type: typeFilter,
        status: statusFilter,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
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
      showToast('请填写正确的金额');
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
      showToast('创建成功');
    } catch (error: any) {
      console.error('Create invoice error:', error);
      showToast(error.message || '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const statusLabels: Record<string, string> = {
      paid: '标记为已支付',
      cancelled: '取消',
      refunded: '退款',
    };
    if (!await confirm(`确定要${statusLabels[status] || status}此账单吗？`)) return;
    try {
      await financeAPI.updateInvoiceStatus(id, status, 'admin');
      loadInvoices();
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
      showToast('操作成功');
    } catch (error: any) {
      console.error('Update invoice error:', error);
      showToast(error.message || '操作失败，请重试');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!await confirm('确定要删除这个账单吗？删除后无法恢复。')) return;
    try {
      await financeAPI.deleteInvoice(id);
      loadInvoices();
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
      showToast('删除成功');
    } catch (error: any) {
      console.error('Delete invoice error:', error);
      const msg = error?.response?.data?.error || error.message || '删除失败，请重试';
      showToast(msg);
    }
  };

  const handleExport = async () => {
    const params: any = {};
    if (typeFilter !== 'all') params.type = typeFilter;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (search) params.search = search;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    try {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== 'all') sp.set(k, String(v));
      });
      const q = sp.toString();
      const token = localStorage.getItem('admin-token');
      const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'https://yunqi-deploy.onrender.com');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`${API_BASE}/api/admin/finance/invoices/export/csv${q ? `?${q}` : ''}`, { headers });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '导出失败' }));
        throw new Error(error.error || '导出失败');
      }
      const blob = await response.blob();
      const cd = response.headers.get('Content-Disposition') || '';
      let filename = 'invoices.csv';
      const match = cd.match(/filename\*=UTF-8''([^;]+)/i);
      if (match) filename = decodeURIComponent(match[1]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      showToast(e.message || '导出失败');
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

  const summaryStats = useMemo(() => {
    const filtered = invoices;
    const totalAmount = filtered.reduce((sum, inv) => {
      if (inv.status === 'paid' || inv.status === 'refunded') {
        return sum + (inv.type === 'sale' ? inv.amount : -inv.amount);
      }
      return sum;
    }, 0);
    const unpaidCount = filtered.filter(i => i.status === 'unpaid').length;
    const unpaidAmount = filtered.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0);
    return { totalAmount, unpaidCount, unpaidAmount };
  }, [invoices]);

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text-gold">账单管理</h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 条账单</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm font-medium flex items-center gap-2 hover:bg-white/80 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            导出
          </button>
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
      </div>

      {/* 统计卡片 */}
      {page === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card group">
            <div className="stat-card__glow" />
            <div className="stat-card__content">
              <span className="text-sm text-muted-foreground">当前页已收金额</span>
              <div className="text-2xl font-bold text-success mt-2">{formatPrice(summaryStats.totalAmount >= 0 ? summaryStats.totalAmount : 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">已支付/已退款</div>
            </div>
          </div>
          <div className="stat-card group">
            <div className="stat-card__glow" style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.2), transparent)' }} />
            <div className="stat-card__content">
              <span className="text-sm text-muted-foreground">待收款账单</span>
              <div className="text-2xl font-bold text-amber-600 mt-2">{summaryStats.unpaidCount}</div>
              <div className="text-xs text-muted-foreground mt-1">待收 {formatPrice(summaryStats.unpaidAmount)}</div>
            </div>
          </div>
          <div className="stat-card group">
            <div className="stat-card__glow" style={{ background: 'linear-gradient(135deg, rgba(139,126,200,0.2), transparent)' }} />
            <div className="stat-card__content">
              <span className="text-sm text-muted-foreground">账单总数</span>
              <div className="text-2xl font-bold gradient-text-gold mt-2">{total}</div>
              <div className="text-xs text-muted-foreground mt-1">全部账单记录</div>
            </div>
          </div>
        </div>
      )}

      {/* 筛选栏 */}
      <div className="glass-card p-4 space-y-3">
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">日期：</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-muted-foreground">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                清除
              </button>
            )}
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
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">关联订单</th>
                    <th className="text-right py-3 px-5 text-sm font-medium text-muted-foreground">金额</th>
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">状态</th>
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">开票日期</th>
                    <th className="text-left py-3 px-5 text-sm font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-white/5 hover:bg-white/30 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                      <td className="py-4 px-5">
                        <span className="font-mono text-sm font-medium text-primary hover:underline">
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
                      <td className="py-4 px-5 text-sm">
                        {inv.order?.orderNo ? (
                          <span className="text-primary font-mono text-xs">{inv.order.orderNo}</span>
                        ) : '-'}
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
                            onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
                            className="text-xs text-primary hover:underline"
                          >
                            详情
                          </button>
                          {inv.status === 'unpaid' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(inv.id, 'paid'); }}
                                className="text-xs text-success hover:underline"
                              >
                                收款
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(inv.id, 'cancelled'); }}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                取消
                              </button>
                            </>
                          )}
                          {inv.status === 'paid' && inv.type === 'sale' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(inv.id, 'refunded'); }}
                              className="text-xs text-error hover:underline"
                            >
                              退款
                            </button>
                          )}
                          {(inv.status === 'unpaid' || inv.status === 'cancelled') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(inv.id); }}
                              className="text-xs text-destructive hover:underline"
                            >
                              删除
                            </button>
                          )}
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
          <div className="w-full max-w-2xl rounded-2xl border-white/50 bg-white/95 backdrop-blur-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">账单详情</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-muted-foreground hover:text-foreground">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-6 pb-6 border-b border-white/10">
              <div className="text-sm text-muted-foreground mb-1">账单金额</div>
              <div className={`text-4xl font-bold ${selectedInvoice.type === 'sale' ? 'text-success' : 'text-error'}`}>
                {selectedInvoice.type === 'sale' ? '+' : '-'}{formatPrice(selectedInvoice.amount)}
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm mt-3 ${getStatusColor(selectedInvoice.status)}`}>
                {getStatusLabel(selectedInvoice.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">账单号</span>
                  <span className="text-sm font-mono">{selectedInvoice.invoiceNo}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">账单类型</span>
                  <span className="text-sm">{getTypeLabel(selectedInvoice.type)}</span>
                </div>
                {selectedInvoice.customerName && (
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-sm text-muted-foreground">客户名称</span>
                    <span className="text-sm">{selectedInvoice.customerName}</span>
                  </div>
                )}
                {selectedInvoice.customerPhone && (
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-sm text-muted-foreground">联系电话</span>
                    <span className="text-sm">{selectedInvoice.customerPhone}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">开票日期</span>
                  <span className="text-sm">{selectedInvoice.issuedAt ? formatDateTime(selectedInvoice.issuedAt) : '-'}</span>
                </div>
                {selectedInvoice.paidAt && (
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-sm text-muted-foreground">支付时间</span>
                    <span className="text-sm">{formatDateTime(selectedInvoice.paidAt)}</span>
                  </div>
                )}
                {selectedInvoice.dueDate && (
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-sm text-muted-foreground">到期日期</span>
                    <span className="text-sm">{formatDateTime(selectedInvoice.dueDate)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">操作人</span>
                  <span className="text-sm">{selectedInvoice.operator || '-'}</span>
                </div>
              </div>
            </div>

            {/* 关联订单 */}
            {selectedInvoice.order && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3">关联订单</h4>
                <div className="p-4 rounded-xl bg-white/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">订单号</span>
                    <span className="text-sm font-mono font-medium">{selectedInvoice.order.orderNo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">订单金额</span>
                    <span className="text-sm font-medium">{formatPrice(selectedInvoice.order.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">下单时间</span>
                    <span className="text-sm">{formatDateTime(selectedInvoice.order.createdAt)}</span>
                  </div>
                  
                  {/* 订单项 */}
                  {selectedInvoice.order.items && selectedInvoice.order.items.length > 0 && (
                    <div className="pt-3 border-t border-white/10">
                      <div className="text-sm text-muted-foreground mb-2">商品明细</div>
                      <div className="space-y-2">
                        {selectedInvoice.order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">×{item.quantity}</span>
                              <span>{item.productName}</span>
                            </div>
                            <span>{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 账单明细项 */}
            {selectedInvoice.items && Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3">账单明细</h4>
                <div className="p-4 rounded-xl bg-white/60 space-y-2">
                  {selectedInvoice.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2">
                        {item.quantity && <span className="text-muted-foreground">×{item.quantity}</span>}
                        <span>{item.name || item.productName || item.description}</span>
                      </div>
                      <span>{formatPrice(item.amount || item.price * (item.quantity || 1))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 备注 */}
            {selectedInvoice.remark && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-2">备注</h4>
                <div className="p-4 rounded-xl bg-white/60 text-sm">{selectedInvoice.remark}</div>
              </div>
            )}

            <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
              <span>创建时间：{formatDateTime(selectedInvoice.createdAt)}</span>
              <span>更新时间：{formatDateTime(selectedInvoice.updatedAt)}</span>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm font-medium hover:bg-white/80"
              >
                关闭
              </button>
              {(selectedInvoice.status === 'unpaid' || selectedInvoice.status === 'cancelled') && (
                <button
                  onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                  className="px-4 py-2.5 rounded-xl border border-error/30 bg-error/10 text-error text-sm font-medium hover:bg-error/20"
                >
                  删除
                </button>
              )}
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
