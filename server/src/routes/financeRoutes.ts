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

    // 订单数
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

    // 客单价
    const avgOrderPrice = monthOrders > 0 ? Math.round((monthIncome._sum.amount || 0) / monthOrders) : 0;

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

      const [income, expense, orderCount] = await Promise.all([
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
      ]);

      const incomeAmt = income._sum.amount || 0;
      const expenseAmt = expense._sum.amount || 0;
      const profit = incomeAmt - expenseAmt;

      months.push({
        month: m + 1,
        income: incomeAmt,
        expense: expenseAmt,
        profit,
        profitRate: incomeAmt > 0 ? Math.round((profit / incomeAmt) * 1000) / 10 : 0,
        orderCount,
        avgOrderPrice: orderCount > 0 ? Math.round(incomeAmt / orderCount) : 0,
      });
    }

    const totalIncome = months.reduce((s, m) => s + m.income, 0);
    const totalExpense = months.reduce((s, m) => s + m.expense, 0);
    const totalProfit = totalIncome - totalExpense;
    const totalOrders = months.reduce((s, m) => s + m.orderCount, 0);

    res.json({
      year: targetYear,
      months,
      summary: {
        totalIncome,
        totalExpense,
        totalProfit,
        profitRate: totalIncome > 0 ? Math.round((totalProfit / totalIncome) * 1000) / 10 : 0,
        totalOrders,
        avgOrderPrice: totalOrders > 0 ? Math.round(totalIncome / totalOrders) : 0,
      },
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ error: '获取月度报表失败' });
  }
});

export default router;
