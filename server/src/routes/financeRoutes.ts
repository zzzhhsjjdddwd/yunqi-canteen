// @ts-nocheck
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// 初始化财务分类
async function initFinanceCategories() {
  const count = await prisma.financeCategory.count();
  if (count > 0) return;

  const categories = [
    // 收入分类
    { name: '销售收入', type: 'income', icon: 'shopping-bag', color: '#6BA88A', sortOrder: 1, isSystem: true },
    { name: '其他收入', type: 'income', icon: 'plus-circle', color: '#5BA3A3', sortOrder: 2, isSystem: true },
    // 支出分类
    { name: '采购成本', type: 'expense', icon: 'package', color: '#C9A96E', sortOrder: 1, isSystem: true },
    { name: '人工成本', type: 'expense', icon: 'users', color: '#C47070', sortOrder: 2, isSystem: true },
    { name: '运营费用', type: 'expense', icon: 'settings', color: '#5BA3A3', sortOrder: 3, isSystem: true },
    { name: '房租水电', type: 'expense', icon: 'home', color: '#8B7EC8', sortOrder: 4, isSystem: true },
    { name: '退款支出', type: 'expense', icon: 'rotate-ccw', color: '#E8736A', sortOrder: 5, isSystem: true },
    { name: '其他支出', type: 'expense', icon: 'more-horizontal', color: '#999', sortOrder: 6, isSystem: true },
  ];

  for (const cat of categories) {
    await prisma.financeCategory.create({ data: cat });
  }
  console.log('财务分类初始化完成');
}

// 计算当前余额
async function getCurrentBalance(): Promise<number> {
  const lastTx = await prisma.transaction.findFirst({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' },
  });
  return lastTx?.balanceAfter || 0;
}

// 生成交易流水号
function generateReferenceNo(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TX${y}${m}${d}${rand}`;
}

// 生成账单编号
function generateInvoiceNo(type: string): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const prefix = type === 'sale' ? 'INV' : type === 'expense' ? 'EXP' : 'REF';
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${y}${m}${d}${rand}`;
}

// ============================================
// 财务概览统计
// ============================================
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // 今日收入/支出
    const todayIncome = await prisma.transaction.aggregate({
      where: { type: 'income', status: 'completed', createdAt: { gte: todayStart } },
      _sum: { amount: true },
    });
    const todayExpense = await prisma.transaction.aggregate({
      where: { type: 'expense', status: 'completed', createdAt: { gte: todayStart } },
      _sum: { amount: true },
    });

    // 本月收入/支出
    const monthIncome = await prisma.transaction.aggregate({
      where: { type: 'income', status: 'completed', createdAt: { gte: monthStart } },
      _sum: { amount: true },
    });
    const monthExpense = await prisma.transaction.aggregate({
      where: { type: 'expense', status: 'completed', createdAt: { gte: monthStart } },
      _sum: { amount: true },
    });

    // 本年收入/支出
    const yearIncome = await prisma.transaction.aggregate({
      where: { type: 'income', status: 'completed', createdAt: { gte: yearStart } },
      _sum: { amount: true },
    });
    const yearExpense = await prisma.transaction.aggregate({
      where: { type: 'expense', status: 'completed', createdAt: { gte: yearStart } },
      _sum: { amount: true },
    });

    // 账户余额
    const balance = await getCurrentBalance();

    // 订单数和订单收入（用于客单价计算）
    const todayOrders = await prisma.order.count({
      where: {
        createdAt: { gte: todayStart },
        paymentStatus: 'paid',
        deletedByUser: false,
      },
    });
    const monthOrders = await prisma.order.count({
      where: {
        createdAt: { gte: monthStart },
        paymentStatus: 'paid',
        deletedByUser: false,
      },
    });
    const monthOrderTotal = await prisma.order.aggregate({
      where: {
        createdAt: { gte: monthStart },
        paymentStatus: 'paid',
        deletedByUser: false,
      },
      _sum: { total: true },
    });

    // 客单价
    const avgOrderPrice = monthOrders > 0 ? Math.round((monthOrderTotal._sum.total || 0) / monthOrders) : 0;

    res.json({
      balance,
      today: {
        income: todayIncome._sum.amount || 0,
        expense: todayExpense._sum.amount || 0,
        profit: (todayIncome._sum.amount || 0) - (todayExpense._sum.amount || 0),
        orders: todayOrders,
      },
      month: {
        income: monthIncome._sum.amount || 0,
        expense: monthExpense._sum.amount || 0,
        profit: (monthIncome._sum.amount || 0) - (monthExpense._sum.amount || 0),
        orders: monthOrders,
        avgOrderPrice,
      },
      year: {
        income: yearIncome._sum.amount || 0,
        expense: yearExpense._sum.amount || 0,
        profit: (yearIncome._sum.amount || 0) - (yearExpense._sum.amount || 0),
      },
    });
  } catch (error) {
    console.error('Finance overview error:', error);
    res.status(500).json({ error: '获取财务概览失败' });
  }
});

// ============================================
// 交易记录列表（收支明细）
// ============================================
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const {
      type,
      category,
      status,
      startDate,
      endDate,
      page = '1',
      pageSize = '20',
      search,
    } = req.query as any;

    const where: any = {};
    if (type && type !== 'all') where.type = type;
    if (category && category !== 'all') where.category = category;
    if (status && status !== 'all') where.status = status;
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate + 'T23:59:59') };
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { remark: { contains: search } },
        { referenceNo: { contains: search } },
      ];
    }

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: { order: { include: { items: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
    ]);

    res.json({
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      list: transactions,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: '获取交易记录失败' });
  }
});

// ============================================
// 创建交易记录（收入/支出）
// ============================================
router.post('/transactions', async (req: Request, res: Response) => {
  try {
    const {
      type,
      category,
      amount,
      description,
      remark,
      orderId,
      paymentMethod,
      operator,
    } = req.body;

    if (!type || !category || !amount || amount <= 0) {
      return res.status(400).json({ error: '请填写完整的交易信息' });
    }

    const currentBalance = await getCurrentBalance();
    const referenceNo = generateReferenceNo();

    let newBalance = currentBalance;
    if (type === 'income') {
      newBalance = currentBalance + amount;
    } else if (type === 'expense') {
      newBalance = currentBalance - amount;
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        category,
        amount,
        balanceAfter: newBalance,
        orderId,
        description,
        remark,
        operator,
        referenceNo,
        paymentMethod,
        status: 'completed',
      },
      include: { order: true },
    });

    res.json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: '创建交易记录失败' });
  }
});

// ============================================
// 获取交易详情
// ============================================
router.get('/transactions/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { order: { include: { items: true } } },
    });
    if (!transaction) {
      return res.status(404).json({ error: '交易记录不存在' });
    }
    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: '获取交易详情失败' });
  }
});

// ============================================
// 审计日志
// ============================================
function auditLog(entry: { action: string; entityId: string; entityType: string; operator?: string }) {
  console.log(JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
  }));
}

// ============================================
// 删除交易记录
// ============================================
router.delete('/transactions/:id', async (req: Request, res: Response) => {
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });
    if (!tx) {
      return res.status(404).json({ error: '交易记录不存在' });
    }

    // 超过24小时的交易记录不可删除
    const now = new Date();
    const created = new Date(tx.createdAt);
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      return res.status(403).json({ error: '超过24小时的交易记录不可删除' });
    }

    await prisma.transaction.delete({
      where: { id: req.params.id },
    });

    auditLog({
      action: 'DELETE_TRANSACTION',
      entityId: req.params.id,
      entityType: 'transaction',
      operator: req.adminUsername,
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: '删除交易记录失败' });
  }
});

// ============================================
// 财务分类
// ============================================
router.get('/categories', async (req: Request, res: Response) => {
  try {
    // 确保分类已初始化
    await initFinanceCategories();

    const { type } = req.query;
    const where: any = { isActive: true };
    if (type) where.type = type;

    const categories = await prisma.financeCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    console.error('Get finance categories error:', error);
    res.status(500).json({ error: '获取财务分类失败' });
  }
});

// ============================================
// 收支趋势（按天/周/月）
// ============================================
router.get('/trend', async (req: Request, res: Response) => {
  try {
    const { period = '30d', type = 'day' } = req.query as any;

    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;
    else if (period === '12m') days = 365;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'completed',
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 按日期聚合
    const dailyData: Record<string, { income: number; expense: number; date: string }> = {};
    
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyData[key] = { date: key, income: 0, expense: 0 };
    }

    for (const tx of transactions) {
      const key = tx.createdAt.toISOString().split('T')[0];
      if (dailyData[key]) {
        if (tx.type === 'income') dailyData[key].income += tx.amount;
        else if (tx.type === 'expense') dailyData[key].expense += tx.amount;
      }
    }

    const result = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
    res.json(result);
  } catch (error) {
    console.error('Finance trend error:', error);
    res.status(500).json({ error: '获取收支趋势失败' });
  }
});

// ============================================
// 分类统计（饼图数据）
// ============================================
router.get('/category-stats', async (req: Request, res: Response) => {
  try {
    const { type = 'income', period = 'month' } = req.query as any;

    let startDate: Date;
    const now = new Date();

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        type: type as string,
        status: 'completed',
        createdAt: { gte: startDate },
      },
    });

    const categoryMap: Record<string, number> = {};
    let total = 0;

    for (const tx of transactions) {
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
      total += tx.amount;
    }

    const categories = await prisma.financeCategory.findMany({
      where: { type: type as string },
    });

    const result = Object.entries(categoryMap).map(([category, amount]) => {
      const catInfo = categories.find(c => c.name === category);
      return {
        category,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
        color: catInfo?.color || '#999',
        icon: catInfo?.icon,
      };
    }).sort((a, b) => b.amount - a.amount);

    res.json({ total, list: result });
  } catch (error) {
    console.error('Category stats error:', error);
    res.status(500).json({ error: '获取分类统计失败' });
  }
});

// ============================================
// 账单列表
// ============================================
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const {
      type,
      status,
      page = '1',
      pageSize = '20',
      search,
    } = req.query as any;

    const where: any = {};
    if (type && type !== 'all') where.type = type;
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { invoiceNo: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: { order: { include: { items: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(pageSize),
        take: parseInt(pageSize),
      }),
    ]);

    res.json({
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      list: invoices,
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: '获取账单列表失败' });
  }
});

// ============================================
// 创建账单
// ============================================
router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const {
      type,
      amount,
      orderId,
      customerName,
      customerPhone,
      dueDate,
      items,
      remark,
      operator,
    } = req.body;

    if (!type || !amount || amount <= 0) {
      return res.status(400).json({ error: '请填写完整的账单信息' });
    }

    const invoiceNo = generateInvoiceNo(type);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        type,
        amount,
        orderId,
        customerName,
        customerPhone,
        dueDate: dueDate ? new Date(dueDate) : null,
        items: items || null,
        remark,
        operator,
        issuedAt: new Date(),
      },
      include: { order: true },
    });

    res.json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: '创建账单失败' });
  }
});

// ============================================
// 账单详情
// ============================================
router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { order: { include: { items: true } } },
    });
    if (!invoice) {
      return res.status(404).json({ error: '账单不存在' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: '获取账单详情失败' });
  }
});

// ============================================
// 更新账单状态（支付/取消/退款）
// ============================================
router.patch('/invoices/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, operator } = req.body;
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });
    if (!invoice) {
      return res.status(404).json({ error: '账单不存在' });
    }

    const updateData: any = { status };
    if (status === 'paid') updateData.paidAt = new Date();

    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // 如果账单已支付，自动生成交易记录
    if (status === 'paid' && invoice.status !== 'paid') {
      const currentBalance = await getCurrentBalance();
      const referenceNo = generateReferenceNo();
      const txType = invoice.type === 'sale' ? 'income' : 'expense';
      const newBalance = txType === 'income' 
        ? currentBalance + invoice.amount 
        : currentBalance - invoice.amount;

      await prisma.transaction.create({
        data: {
          type: txType,
          category: invoice.type === 'sale' ? '销售收入' : '其他支出',
          amount: invoice.amount,
          balanceAfter: newBalance,
          orderId: invoice.orderId || undefined,
          description: `账单支付 - ${invoice.invoiceNo}`,
          referenceNo,
          operator: operator || 'system',
          status: 'completed',
        },
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({ error: '更新账单状态失败' });
  }
});

// ============================================
// 删除账单
// ============================================
router.delete('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });
    if (!invoice) {
      return res.status(404).json({ error: '账单不存在' });
    }

    // 只有未支付或已取消状态的账单才可删除
    if (invoice.status !== 'unpaid' && invoice.status !== 'cancelled') {
      return res.status(403).json({ error: '只有未支付或已取消状态的账单才可删除' });
    }

    await prisma.invoice.delete({
      where: { id: req.params.id },
    });

    auditLog({
      action: 'DELETE_INVOICE',
      entityId: req.params.id,
      entityType: 'invoice',
      operator: req.adminUsername,
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: '删除账单失败' });
  }
});

// ============================================
// 财务报表（月度对比）
// ============================================
router.get('/report/monthly', async (req: Request, res: Response) => {
  try {
    const { year } = req.query as any;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const months: any[] = [];

    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(targetYear, m, 1);
      const monthEnd = new Date(targetYear, m + 1, 0, 23, 59, 59);

      const [income, expense, orderCount, orderTotal] = await Promise.all([
        prisma.transaction.aggregate({
          where: { type: 'income', status: 'completed', createdAt: { gte: monthStart, lte: monthEnd } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { type: 'expense', status: 'completed', createdAt: { gte: monthStart, lte: monthEnd } },
          _sum: { amount: true },
        }),
        prisma.order.count({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
            paymentStatus: 'paid',
            deletedByUser: false,
          },
        }),
        prisma.order.aggregate({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
            paymentStatus: 'paid',
            deletedByUser: false,
          },
          _sum: { total: true },
        }),
      ]);

      const incomeAmt = income._sum.amount || 0;
      const expenseAmt = expense._sum.amount || 0;
      const profit = incomeAmt - expenseAmt;
      const orderTotalAmt = orderTotal._sum.total || 0;

      months.push({
        month: m + 1,
        income: incomeAmt,
        expense: expenseAmt,
        profit,
        profitRate: incomeAmt > 0 ? Math.round((profit / incomeAmt) * 1000) / 10 : 0,
        orderCount,
        avgOrderPrice: orderCount > 0 ? Math.round(orderTotalAmt / orderCount) : 0,
      });
    }

    const totalIncome = months.reduce((s, m) => s + m.income, 0);
    const totalExpense = months.reduce((s, m) => s + m.expense, 0);
    const totalProfit = totalIncome - totalExpense;
    const totalOrders = months.reduce((s, m) => s + m.orderCount, 0);
    const totalOrderRevenue = months.reduce((s, m) => {
      return s + (m.orderCount > 0 ? m.avgOrderPrice * m.orderCount : 0);
    }, 0);

    res.json({
      year: targetYear,
      months,
      summary: {
        totalIncome,
        totalExpense,
        totalProfit,
        profitRate: totalIncome > 0 ? Math.round((totalProfit / totalIncome) * 1000) / 10 : 0,
        totalOrders,
        avgOrderPrice: totalOrders > 0 ? Math.round(totalOrderRevenue / totalOrders) : 0,
      },
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ error: '获取月度报表失败' });
  }
});

// ============================================
// 导出交易记录 CSV
// ============================================
router.get('/transactions/export/csv', async (req: Request, res: Response) => {
  try {
    const {
      type,
      category,
      status,
      startDate,
      endDate,
      search,
    } = req.query as any;

    const where: any = {};
    if (type && type !== 'all') where.type = type;
    if (category && category !== 'all') where.category = category;
    if (status && status !== 'all') where.status = status;
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate + 'T23:59:59') };
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { remark: { contains: search } },
        { referenceNo: { contains: search } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      '流水号', '类型', '分类', '金额', '余额', '状态',
      '描述', '备注', '支付方式', '操作人', '关联订单号', '创建时间'
    ];

    const rows = transactions.map(tx => [
      tx.referenceNo || '',
      tx.type === 'income' ? '收入' : '支出',
      tx.category || '',
      (tx.amount / 100).toFixed(2),
      (tx.balanceAfter / 100).toFixed(2),
      tx.status === 'completed' ? '已完成' : tx.status === 'pending' ? '待处理' : '失败',
      tx.description || '',
      tx.remark || '',
      tx.paymentMethod || '',
      tx.operator || '',
      tx.order?.orderNo || '',
      new Date(tx.createdAt).toLocaleString('zh-CN'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const filename = `交易明细_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength('\uFEFF' + csvContent, 'utf8'));
    
    res.write('\uFEFF');
    res.write(csvContent);
    res.end();
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// ============================================
// 导出月度报表 CSV
// ============================================
router.get('/report/monthly/export/csv', async (req: Request, res: Response) => {
  try {
    const { year } = req.query as any;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const months: any[] = [];

    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(targetYear, m, 1);
      const monthEnd = new Date(targetYear, m + 1, 0, 23, 59, 59);

      const [income, expense, orderCount, orderTotal] = await Promise.all([
        prisma.transaction.aggregate({
          where: { type: 'income', status: 'completed', createdAt: { gte: monthStart, lte: monthEnd } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { type: 'expense', status: 'completed', createdAt: { gte: monthStart, lte: monthEnd } },
          _sum: { amount: true },
        }),
        prisma.order.count({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
            paymentStatus: 'paid',
            deletedByUser: false,
          },
        }),
        prisma.order.aggregate({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd },
            paymentStatus: 'paid',
            deletedByUser: false,
          },
          _sum: { total: true },
        }),
      ]);

      const incomeAmt = income._sum.amount || 0;
      const expenseAmt = expense._sum.amount || 0;
      const profit = incomeAmt - expenseAmt;
      const orderTotalAmt = orderTotal._sum.total || 0;

      months.push({
        month: m + 1,
        income: incomeAmt,
        expense: expenseAmt,
        profit,
        profitRate: incomeAmt > 0 ? Math.round((profit / incomeAmt) * 1000) / 10 : 0,
        orderCount,
        avgOrderPrice: orderCount > 0 ? Math.round(orderTotalAmt / orderCount) : 0,
      });
    }

    const totalIncome = months.reduce((s, m) => s + m.income, 0);
    const totalExpense = months.reduce((s, m) => s + m.expense, 0);
    const totalProfit = totalIncome - totalExpense;
    const totalOrders = months.reduce((s, m) => s + m.orderCount, 0);

    const headers = ['月份', '营收', '支出', '净利润', '利润率', '订单数', '客单价'];

    const rows = months.map(m => [
      `${m.month}月`,
      (m.income / 100).toFixed(2),
      (m.expense / 100).toFixed(2),
      (m.profit / 100).toFixed(2),
      `${m.profitRate}%`,
      m.orderCount,
      (m.avgOrderPrice / 100).toFixed(2),
    ]);

    rows.push([
      '合计',
      (totalIncome / 100).toFixed(2),
      (totalExpense / 100).toFixed(2),
      (totalProfit / 100).toFixed(2),
      `${totalIncome > 0 ? ((totalProfit / totalIncome) * 100).toFixed(1) : 0}%`,
      totalOrders,
      totalOrders > 0 ? ((totalIncome / 100) / totalOrders).toFixed(2) : '0.00',
    ]);

    const csvContent = [
      `${targetYear}年度财务报表`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const filename = `${targetYear}年度财务报表.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength('\uFEFF' + csvContent, 'utf8'));
    
    res.write('\uFEFF');
    res.write(csvContent);
    res.end();
  } catch (error) {
    console.error('Export monthly report error:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// ============================================
// 智能财务分析（基于真实订单数据）
// ============================================
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { period = 'month' } = req.query as any;
    
    // 计算时间范围
    const now = new Date();
    let currentStart: Date, previousStart: Date, previousYearStart: Date;
    
    if (period === 'today') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      previousYearStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else if (period === 'week') {
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - 7);
      previousStart = new Date(now);
      previousStart.setDate(now.getDate() - 14);
      previousYearStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else if (period === 'year') {
      currentStart = new Date(now.getFullYear(), 0, 1);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousYearStart = new Date(now.getFullYear() - 2, 0, 1);
    } else {
      // month
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousYearStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    }

    // 本期数据（从真实订单统计）
    const [currentOrders, currentTransactions] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: currentStart },
          paymentStatus: 'paid',
          deletedByUser: false,
        },
        include: { items: true },
      }),
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: currentStart },
          status: 'completed',
        },
      }),
    ]);

    // 上期数据
    const previousOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: previousStart, lt: currentStart },
        paymentStatus: 'paid',
        deletedByUser: false,
      },
    });

    // 去年同期数据
    const previousYearOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: previousYearStart, lt: previousStart },
        paymentStatus: 'paid',
        deletedByUser: false,
      },
    });

    // 计算各项指标
    const currentIncome = currentOrders.reduce((sum, o) => sum + o.total, 0);
    const currentExpense = currentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const currentProfit = currentIncome - currentExpense;
    const currentOrderCount = currentOrders.length;

    const previousIncome = previousOrders.reduce((sum, o) => sum + o.total, 0);
    const previousOrderCount = previousOrders.length;

    const previousYearIncome = previousYearOrders.reduce((sum, o) => sum + o.total, 0);
    const previousYearOrderCount = previousYearOrders.length;

    // 环比增长
    const momGrowth = previousIncome > 0 
      ? Math.round(((currentIncome - previousIncome) / previousIncome) * 1000) / 10 
      : 0;
    
    // 同比增长
    const yoyGrowth = previousYearIncome > 0 
      ? Math.round(((currentIncome - previousYearIncome) / previousYearIncome) * 1000) / 10 
      : 0;

    // 客单价分析
    const avgOrderPrice = currentOrderCount > 0 ? Math.round(currentIncome / currentOrderCount) : 0;
    const previousAvgOrderPrice = previousOrderCount > 0 ? Math.round(previousIncome / previousOrderCount) : 0;

    // 商品销售排行（从订单明细统计）
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const order of currentOrders) {
      for (const item of order.items) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.price * item.quantity;
      }
    }
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([id, data]) => ({ productId: id, ...data }));

    // 支付方式分布
    const paymentMethods: Record<string, number> = {};
    for (const tx of currentTransactions.filter(t => t.type === 'income' && t.paymentMethod)) {
      paymentMethods[tx.paymentMethod] = (paymentMethods[tx.paymentMethod] || 0) + tx.amount;
    }
    const paymentDistribution = Object.entries(paymentMethods).map(([method, amount]) => ({
      method,
      amount,
      percentage: currentIncome > 0 ? Math.round((amount / currentIncome) * 1000) / 10 : 0,
    }));

    // 时段分析（按小时统计）
    const hourlyStats: Record<number, { orders: number; income: number }> = {};
    for (const order of currentOrders) {
      const hour = new Date(order.createdAt).getHours();
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { orders: 0, income: 0 };
      }
      hourlyStats[hour].orders += 1;
      hourlyStats[hour].income += order.total;
    }
    const peakHours = Object.entries(hourlyStats)
      .sort((a, b) => b[1].income - a[1].income)
      .slice(0, 3)
      .map(([hour, data]) => ({ hour: parseInt(hour), ...data }));

    res.json({
      period,
      current: {
        income: currentIncome,
        expense: currentExpense,
        profit: currentProfit,
        profitRate: currentIncome > 0 ? Math.round((currentProfit / currentIncome) * 1000) / 10 : 0,
        orderCount: currentOrderCount,
        avgOrderPrice,
      },
      comparison: {
        momIncome: previousIncome,
        momGrowth,
        momOrderCount: previousOrderCount,
        yoyIncome: previousYearIncome,
        yoyGrowth,
        yoyOrderCount: previousYearOrderCount,
        avgOrderPriceChange: previousAvgOrderPrice > 0 
          ? Math.round(((avgOrderPrice - previousAvgOrderPrice) / previousAvgOrderPrice) * 1000) / 10 
          : 0,
      },
      topProducts,
      paymentDistribution,
      peakHours,
    });
  } catch (error) {
    console.error('Finance analytics error:', error);
    res.status(500).json({ error: '获取财务分析失败' });
  }
});

// ============================================
// 订单统计（来自真实订单数据）
// ============================================
router.get('/order-stats', async (req: Request, res: Response) => {
  try {
    const { period = 'month' } = req.query as any;
    
    const now = new Date();
    let startDate: Date;
    
    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // 从真实订单统计收入
    const paidOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        paymentStatus: 'paid',
        deletedByUser: false,
      },
      include: { items: true },
    });

    const totalIncome = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = paidOrders.length;
    const avgOrderPrice = totalOrders > 0 ? Math.round(totalIncome / totalOrders) : 0;

    // 按时段分组
    const dailyStats: Record<string, { orders: number; income: number }> = {};
    for (const order of paidOrders) {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { orders: 0, income: 0 };
      }
      dailyStats[dateKey].orders += 1;
      dailyStats[dateKey].income += order.total;
    }

    const dailyTrend = Object.entries(dailyStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({ date, ...data }));

    res.json({
      period,
      totalIncome,
      totalOrders,
      avgOrderPrice,
      dailyTrend,
    });
  } catch (error) {
    console.error('Order stats error:', error);
    res.status(500).json({ error: '获取订单统计失败' });
  }
});

export default router;
