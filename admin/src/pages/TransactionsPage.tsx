import { useEffect, useState } from 'react';
import { financeAPI, formatPrice, formatDateTime } from '../api/finance';
import { useToast } from '../components/ui/Toast';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

const TransactionsPage = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [editingTx, setEditingTx] = useState<any>(null);
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const [newTx, setNewTx] = useState({
    type: 'income',
    category: '',
    amount: '',
    description: '',
    remark: '',
    paymentMethod: 'cash',
  });

  const [adjustForm, setAdjustForm] = useState({
    amount: '',
    reason: '',
    category: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    type: 'income',
    icon: '',
    color: '#6BA88A',
    sortOrder: 0,
    isActive: true,
    isEdit: false,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [page, typeFilter, categoryFilter, statusFilter, paymentMethodFilter, startDate, endDate]);

  const loadCategories = async () => {
    try {
      const cats = await financeAPI.getCategories(undefined, true);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const result = await financeAPI.getTransactions({
        page,
        pageSize,
        type: typeFilter,
        category: categoryFilter,
        status: statusFilter,
        paymentMethod: paymentMethodFilter,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
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

  const isEditable = (tx: any) => {
    const now = new Date();
    const created = new Date(tx.createdAt);
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24 && tx.status === 'completed';
  };

  const handleSubmit = async () => {
    if (!newTx.category || !newTx.amount) {
      showToast('请填写完整信息');
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
      showToast('添加成功');
    } catch (error: any) {
      console.error('Create transaction error:', error);
      showToast(error.message || '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingTx) return;
    if (!editingTx.category || !editingTx.amount) {
      showToast('请填写完整信息');
      return;
    }
    setSubmitting(true);
    try {
      const amountInFen = Math.round(parseFloat(editingTx.amount) * 100);
      await financeAPI.updateTransaction(editingTx.id, {
        category: editingTx.category,
        amount: amountInFen,
        description: editingTx.description,
        remark: editingTx.remark,
        paymentMethod: editingTx.paymentMethod,
      });
      setShowEditDialog(false);
      setEditingTx(null);
      loadTransactions();
      showToast('修改成功');
    } catch (error: any) {
      console.error('Update transaction error:', error);
      showToast(error.message || '修改失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!await confirm('确定要删除这条交易记录吗？删除后余额将自动重算。')) return;
    try {
      await financeAPI.deleteTransaction(id);
      loadTransactions();
      if (selectedTx?.id === id) setSelectedTx(null);
      showToast('删除成功');
    } catch (error: any) {
      console.error('Delete transaction error:', error);
      showToast(error.message || '删除失败，请重试');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!await confirm(`确定要删除选中的 ${selectedIds.length} 条记录吗？`)) return;
    try {
      await financeAPI.batchDeleteTransactions(selectedIds);
      loadTransactions();
      showToast(`已删除 ${selectedIds.length} 条记录`);
    } catch (error: any) {
      console.error('Batch delete error:', error);
      showToast(error.message || '批量删除失败');
    }
  };

  const handleReverse = async (tx: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const reason = window.prompt('请输入红冲原因：');
    if (!reason) return;
    if (!await confirm('确定要红冲这笔交易吗？将生成一笔反向交易。')) return;
    try {
      await financeAPI.reverseTransaction(tx.id, reason);
      loadTransactions();
      showToast('红冲成功');
    } catch (error: any) {
      console.error('Reverse transaction error:', error);
      showToast(error.message || '红冲失败');
    }
  };

  const handleAdjustBalance = async () => {
    if (!adjustForm.amount || !adjustForm.reason) {
      showToast('请填写金额和原因');
      return;
    }
    const amount = parseFloat(adjustForm.amount);
    if (amount === 0) {
      showToast('调整金额不能为0');
      return;
    }
    if (!await confirm(`确定要${amount > 0 ? '调增' : '调减'}余额 ${Math.abs(amount).toFixed(2)} 元吗？`)) return;
    setSubmitting(true);
    try {
      await financeAPI.adjustBalance({
        amount: Math.round(amount * 100),
        reason: adjustForm.reason,
        category: adjustForm.category || (amount > 0 ? '其他收入' : '其他支出'),
      });
      setShowAdjustDialog(false);
      setAdjustForm({ amount: '', reason: '', category: '' });
      loadTransactions();
      showToast('余额调整成功');
    } catch (error: any) {
      console.error('Adjust balance error:', error);
      showToast(error.message || '调整失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategorySubmit = async () => {
    if (!categoryForm.name) {
      showToast('请输入分类名称');
      return;
    }
    setSubmitting(true);
    try {
      if (categoryForm.isEdit) {
        await financeAPI.updateCategory(categoryForm.id, {
          name: categoryForm.name,
          icon: categoryForm.icon,
          color: categoryForm.color,
          sortOrder: categoryForm.sortOrder,
          isActive: categoryForm.isActive,
        });
        showToast('修改成功');
      } else {
        await financeAPI.createCategory({
          name: categoryForm.name,
          type: categoryForm.type,
          icon: categoryForm.icon,
          color: categoryForm.color,
          sortOrder: categoryForm.sortOrder,
        });
        showToast('创建成功');
      }
      setShowCategoryDialog(false);
      setCategoryForm({ id: '', name: '', type: 'income', icon: '', color: '#6BA88A', sortOrder: 0, isActive: true, isEdit: false });
      loadCategories();
    } catch (error: any) {
      console.error('Category save error:', error);
      showToast(error.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cat.isSystem) {
      showToast('系统分类不可删除');
      return;
    }
    if (!await confirm(`确定要删除分类"${cat.name}"吗？`)) return;
    try {
      await financeAPI.deleteCategory(cat.id);
      loadCategories();
      showToast('删除成功');
    } catch (error: any) {
      console.error('Delete category error:', error);
      showToast(error.message || '删除失败');
    }
  };

  const openEditDialog = (tx: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTx({
      ...tx,
      amount: (tx.amount / 100).toString(),
    });
    setShowEditDialog(true);
  };

  const openCategoryEdit = (cat: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCategoryForm({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      icon: cat.icon || '',
      color: cat.color || '#6BA88A',
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      isEdit: true,
    });
    setShowCategoryDialog(true);
  };

  const openCategoryCreate = (type: string) => {
    setCategoryForm({
      id: '',
      name: '',
      type,
      icon: '',
      color: type === 'income' ? '#6BA88A' : '#C9A96E',
      sortOrder: categories.filter(c => c.type === type).length + 1,
      isActive: true,
      isEdit: false,
    });
    setShowCategoryDialog(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map(t => t.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    const params: any = {};
    if (typeFilter !== 'all') params.type = typeFilter;
    if (categoryFilter !== 'all') params.category = categoryFilter;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (paymentMethodFilter !== 'all') params.paymentMethod = paymentMethodFilter;
    if (search) params.search = search;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    try {
      await financeAPI.exportTransactions(params);
    } catch (e: any) {
      showToast(e.message || '导出失败');
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = { income: '收入', expense: '支出', transfer: '转账' };
    return map[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { completed: '已完成', pending: '处理中', failed: '失败', cancelled: '已取消' };
    return map[status] || status;
  };

  const getPaymentMethodLabel = (method: string) => {
    const map: Record<string, string> = { cash: '现金', wechat: '微信', alipay: '支付宝', bank: '银行转账', manual: '手动调整', other: '其他' };
    return map[method] || method || '-';
  };

  const getTypeIcon = (type: string, _category: string) => {
    const isIncome = type === 'income';
    const bgClass = isIncome ? 'bg-success/10' : 'bg-error/10';
    const textClass = isIncome ? 'text-success' : 'text-error';
    return (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgClass}`}>
        <svg className={`w-5 h-5 ${textClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  const filteredCategories = categories.filter(c => c.type === newTx.type && c.isActive);
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text-gold">收支明细</h1>
          <p className="text-sm text-muted-foreground mt-1">共 {total} 条记录</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdjustDialog(true)}
            className="px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm font-medium flex items-center gap-2 hover:bg-white/80 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            余额调整
          </button>
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
            新增记录
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="glass-card p-4 space-y-3">
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

          <select
            value={paymentMethodFilter}
            onChange={(e) => { setPaymentMethodFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">全部支付方式</option>
            <option value="cash">现金</option>
            <option value="wechat">微信</option>
            <option value="alipay">支付宝</option>
            <option value="bank">银行转账</option>
            <option value="manual">手动调整</option>
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

          <div className="flex-1" />

          <button
            onClick={() => setShowCategoryDialog(true)}
            onMouseDown={(e) => { e.preventDefault(); openCategoryCreate(typeFilter === 'all' ? 'income' : typeFilter); }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            管理分类
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-sm">已选择 <strong>{selectedIds.length}</strong> 条记录</span>
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 rounded-lg text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              批量删除
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              取消选择
            </button>
          </div>
        )}
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
                    <th className="py-3 px-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === transactions.length && transactions.length > 0}
                        onChange={toggleSelectAll}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 rounded"
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">交易</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">分类</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">支付方式</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">金额</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">余额</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">状态</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">时间</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`border-b border-white/5 hover:bg-white/30 transition-colors cursor-pointer ${selectedIds.includes(tx.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedTx(tx)}
                    >
                      <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tx.id)}
                          onChange={() => toggleSelect(tx.id, { stopPropagation: () => {} } as any)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 rounded"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(tx.type, tx.category)}
                          <div>
                            <div className="font-medium text-sm">{tx.description || tx.category}</div>
                            <div className="text-xs text-muted-foreground font-mono">{tx.referenceNo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/60 border border-white/40">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {getPaymentMethodLabel(tx.paymentMethod)}
                      </td>
                      <td className={`py-4 px-4 text-right font-semibold text-sm ${tx.type === 'income' ? 'text-success' : 'text-error'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatPrice(tx.amount)}
                      </td>
                      <td className="py-4 px-4 text-right text-sm text-muted-foreground">
                        {formatPrice(tx.balanceAfter)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'completed' ? 'bg-success/10 text-success' :
                          tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          tx.status === 'failed' ? 'bg-error/10 text-error' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {getStatusLabel(tx.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {isEditable(tx) ? (
                            <>
                              <button
                                onClick={(e) => openEditDialog(tx, e)}
                                className="text-xs text-primary hover:underline transition-colors"
                              >
                                编辑
                              </button>
                              <button
                                onClick={(e) => handleDeleteTransaction(tx.id, e)}
                                className="text-xs text-destructive hover:underline transition-colors"
                              >
                                删除
                              </button>
                            </>
                          ) : tx.status === 'completed' ? (
                            <button
                              onClick={(e) => handleReverse(tx, e)}
                              className="text-xs text-amber-600 hover:underline transition-colors"
                              title="红冲：生成反向交易"
                            >
                              红冲
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">-</span>
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
                  step="0.01"
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

      {/* 编辑交易弹窗 */}
      {showEditDialog && editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setShowEditDialog(false); setEditingTx(null); }}>
          <div className="w-full max-w-md rounded-2xl border-white/50 bg-white/95 backdrop-blur-xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-5">编辑交易记录</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white/60">
                <span className="text-sm text-muted-foreground">类型：</span>
                <span className={`text-sm font-medium ${editingTx.type === 'income' ? 'text-success' : 'text-error'}`}>
                  {getTypeLabel(editingTx.type)}
                </span>
                <span className="text-xs text-muted-foreground ml-2">（类型不可修改）</span>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">分类</label>
                <select
                  value={editingTx.category}
                  onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {categories.filter(c => c.type === editingTx.type && c.isActive).map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">金额（元）</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingTx.amount}
                  onChange={(e) => setEditingTx({ ...editingTx, amount: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">描述</label>
                <input
                  type="text"
                  value={editingTx.description || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">备注</label>
                <textarea
                  value={editingTx.remark || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, remark: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">支付方式</label>
                <select
                  value={editingTx.paymentMethod || 'cash'}
                  onChange={(e) => setEditingTx({ ...editingTx, paymentMethod: e.target.value })}
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
                onClick={() => { setShowEditDialog(false); setEditingTx(null); }}
                className="flex-1 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm font-medium hover:bg-white/80"
              >
                取消
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl glass-button text-sm font-medium disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 余额调整弹窗 */}
      {showAdjustDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdjustDialog(false)}>
          <div className="w-full max-w-md rounded-2xl border-white/50 bg-white/95 backdrop-blur-xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">余额调整</h3>
            <p className="text-sm text-muted-foreground mb-5">此操作将直接调整账户余额，请谨慎操作。</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">调整金额（元）</label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                  placeholder="正数调增，负数调减"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground mt-1">输入正数表示余额增加，负数表示余额减少</p>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">分类</label>
                <select
                  value={adjustForm.category}
                  onChange={(e) => setAdjustForm({ ...adjustForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">请选择分类</option>
                  {parseFloat(adjustForm.amount) >= 0
                    ? incomeCategories.filter(c => c.isActive).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    : expenseCategories.filter(c => c.isActive).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">调整原因 *</label>
                <textarea
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="请说明调整原因"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdjustDialog(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/50 bg-white/60 text-sm font-medium hover:bg-white/80"
              >
                取消
              </button>
              <button
                onClick={handleAdjustBalance}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? '提交中...' : '确认调整'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分类管理弹窗 */}
      {showCategoryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowCategoryDialog(false)}>
          <div className="w-full max-w-2xl rounded-2xl border-white/50 bg-white/95 backdrop-blur-xl p-6 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">分类管理</h3>
              <button onClick={() => setShowCategoryDialog(false)} className="text-muted-foreground hover:text-foreground">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-success">收入分类</h4>
                  <button
                    onClick={() => openCategoryCreate('income')}
                    className="text-xs text-primary hover:underline"
                  >
                    + 新增
                  </button>
                </div>
                <div className="space-y-2">
                  {incomeCategories.map(cat => (
                    <div
                      key={cat.id}
                      className={`flex items-center justify-between p-3 rounded-xl ${cat.isActive ? 'bg-white/60' : 'bg-white/30 opacity-60'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: cat.color || '#999' }}
                        >
                          {cat.icon ? cat.icon : '📂'}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {cat.name}
                            {cat.isSystem && <span className="ml-2 text-xs text-muted-foreground">（系统）</span>}
                            {!cat.isActive && <span className="ml-2 text-xs text-muted-foreground">（已停用）</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">排序：{cat.sortOrder}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => openCategoryEdit(cat, e)}
                          className="text-xs text-primary hover:underline"
                        >
                          编辑
                        </button>
                        {!cat.isSystem && (
                          <button
                            onClick={(e) => handleDeleteCategory(cat, e)}
                            className="text-xs text-destructive hover:underline"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-error">支出分类</h4>
                  <button
                    onClick={() => openCategoryCreate('expense')}
                    className="text-xs text-primary hover:underline"
                  >
                    + 新增
                  </button>
                </div>
                <div className="space-y-2">
                  {expenseCategories.map(cat => (
                    <div
                      key={cat.id}
                      className={`flex items-center justify-between p-3 rounded-xl ${cat.isActive ? 'bg-white/60' : 'bg-white/30 opacity-60'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: cat.color || '#999' }}
                        >
                          {cat.icon ? cat.icon : '📂'}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {cat.name}
                            {cat.isSystem && <span className="ml-2 text-xs text-muted-foreground">（系统）</span>}
                            {!cat.isActive && <span className="ml-2 text-xs text-muted-foreground">（已停用）</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">排序：{cat.sortOrder}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => openCategoryEdit(cat, e)}
                          className="text-xs text-primary hover:underline"
                        >
                          编辑
                        </button>
                        {!cat.isSystem && (
                          <button
                            onClick={(e) => handleDeleteCategory(cat, e)}
                            className="text-xs text-destructive hover:underline"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-muted-foreground">
                系统内置分类不可删除，仅可编辑图标和颜色。已使用的自定义分类不可删除。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 分类编辑弹窗 */}
      {categoryForm.isEdit === false ? null : null}
      {categoryForm.id && showCategoryDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30" onClick={(e) => { e.stopPropagation(); setCategoryForm(f => ({ ...f, id: '', isEdit: false })); }}>
          <div className="w-full max-w-sm rounded-2xl border-white/50 bg-white/95 backdrop-blur-xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h4 className="text-base font-semibold mb-4">{categoryForm.isEdit ? '编辑分类' : '新建分类'}</h4>
            
            <div className="space-y-3">
              {!categoryForm.isEdit && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-1.5">类型</label>
                  <select
                    value={categoryForm.type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="income">收入</option>
                    <option value="expense">支出</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">名称</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">颜色</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-white/50 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl border border-white/50 bg-white/60 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">排序</label>
                <input
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-white/50 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {categoryForm.isEdit && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cat-active"
                    checked={categoryForm.isActive}
                    onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="cat-active" className="text-sm text-muted-foreground">启用该分类</label>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setCategoryForm(f => ({ ...f, id: '', isEdit: false }))}
                className="flex-1 py-2 rounded-xl border border-white/50 bg-white/60 text-sm font-medium hover:bg-white/80"
              >
                取消
              </button>
              <button
                onClick={handleCategorySubmit}
                disabled={submitting}
                className="flex-1 py-2 rounded-xl glass-button text-sm font-medium disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存'}
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
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-sm text-muted-foreground">支付方式</span>
                <span className="text-sm">{getPaymentMethodLabel(selectedTx.paymentMethod)}</span>
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
              {selectedTx.operator && (
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">操作人</span>
                  <span className="text-sm">{selectedTx.operator}</span>
                </div>
              )}
              {selectedTx.order && (
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">关联订单</span>
                  <span className="text-sm font-mono">{selectedTx.order.orderNo}</span>
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
