// @ts-nocheck
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminAuthMiddleware } from '../middleware/auth.js';
import {
  generateReferenceNo,
  generateInvoiceNo,
  auditLog,
  getCurrentBalance,
  createTransactionInTx,
  recalcBalanceFrom,
  initFinanceCategories,
} from '../utils/financeService.js';

const prisma = new PrismaClient();
const router = Router();

initFinanceCategories().catch(console.error);

// ============================================
// 财务概览统计
// ============================================
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [todayIncome, todayExpense, monthIncome, monthExpense, yearIncome, yearExpense,
      todayOrders, monthOrders, monthOrderTotal] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: 'income', status: 'completed', createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'expense', status: 'completed', createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'income', status: 'completed', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'expense', status: 'completed', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'income', status: 'completed', createdAt: { gte: yearStart } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'expense', status: 'completed', createdAt: { gte: yearStart } },
        _sum: { amount: true },
      }),
      prisma.order.count({
        where: { createdAt: { gte: todayStart }, paymentStatus: 'paid', deletedByUser: false },
      }),
      prisma.order.count({
        where: { createdAt: { gte: monthStart }, paymentStatus: 'paid', deletedByUser: false },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: monthStart }, paymentStatus: 'paid', deletedByUser: false },
        _sum: { total: true },
      }),
    ]);

    const balance = await getCurrentBalance();
    const avgOrderPrice = monthOrders > 0 ? Math.round((monthOrderTotal._sum.total || 0) / monthOrders) : 0;

    // 昨日对比
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    yesterdayEnd.setTime(yesterdayEnd.getTime() - 1);

    const [yesterdayIncome, yesterdayExpense] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: 'income', status: 'completed', createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'expense', status: 'completed', createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
        _sum: { amount: true },
      }),
    ]);

    const todayIncomeVal = todayIncome._sum.amount || 0;
    const todayExpenseVal = todayExpense._sum.amount || 0;
    const yesterdayIncomeVal = yesterdayIncome._sum.amount || 0;
    const yesterdayExpenseVal = yesterdayExpense._sum.amount || 0;

    res.json({
      balance,
      today: {
        income: todayIncomeVal,
        expense: todayExpenseVal,
        profit: todayIncomeVal - todayExpenseVal,
        orders: todayOrders,
      },
      yesterday: {
        income: yesterdayIncomeVal,
        expense: yesterdayExpenseVal,
        profit: yesterdayIncomeVal - yesterdayExpenseVal,
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
      paymentMethod,
    } = req.query as any;

    const where: any = {};
    if (type && type !== 'all') where.type = type;
    if (category && category !== 'all') where.category = category;
    if (status && status !== 'all') where.status = status;
    if (paymentMethod && paymentMethod !== 'all') where.paymentMethod = paymentMethod;
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
router.post('/transactions', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      type,
      category,
      amount,
      description,
      remark,
      orderId,
      paymentMethod,
    } = req.body;

    if (!type || !category || !amount || amount <= 0) {
      return res.status(400).json({ error: '请填写完整的交易信息' });
    }
    if (!['income', 'expense', 'transfer'].includes(type)) {
      return res.status(400).json({ error: '无效的交易类型' });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      return createTransactionInTx(tx, {
        type,
        category,
        amount,
        orderId,
        description,
        remark,
        operator: req.adminUsername || 'admin',
        paymentMethod,
      });
    });

    const result = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: { order: true },
    });

    auditLog({
      action: 'CREATE_TRANSACTION',
      entityId: transaction.id,
      entityType: 'transaction',
      operator: req.adminUsername,
    });

    res.json(result);
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
// 编辑交易记录（仅当日交易可编辑金额/分类/备注等）
// ============================================
router.put('/transactions/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { category, amount, description, remark, paymentMethod } = req.body;

    const existing = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: '交易记录不存在' });
    }
    if (existing.status !== 'completed') {
      return res.status(400).json({ error: '仅已完成的交易可编辑' });
    }

    const now = new Date();
    const created = new Date(existing.createdAt);
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      return res.status(403).json({ error: '超过24小时的交易不可编辑，请使用红冲功能' });
    }

    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({ error: '金额必须大于0' });
    }

    const newAmount = amount !== undefined ? amount : existing.amount;
    const amountChanged = newAmount !== existing.amount;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.transaction.update({
        where: { id: req.params.id },
        data: {
          category: category !== undefined ? category : existing.category,
          amount: newAmount,
          description: description !== undefined ? description : existing.description,
          remark: remark !== undefined ? remark : existing.remark,
          paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
        },
      });

      if (amountChanged) {
        const prevTx = await tx.transaction.findFirst({
          where: {
            status: 'completed',
            createdAt: { lt: existing.createdAt },
          },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true },
        });
        const prevBalance = prevTx?.balanceAfter || 0;
        const newBalance = existing.type === 'income'
          ? prevBalance + newAmount
          : prevBalance - newAmount;

        await tx.transaction.update({
          where: { id: req.params.id },
          data: { balanceAfter: newBalance },
        });

        await recalcBalanceFrom(tx, existing.createdAt, newBalance);
      }

      return result;
    });

    auditLog({
      action: 'UPDATE_TRANSACTION',
      entityId: req.params.id,
      entityType: 'transaction',
      operator: req.adminUsername,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: '更新交易记录失败' });
  }
});

// ============================================
// 红冲交易（创建反向交易，保留痕迹）
// ============================================
router.post('/transactions/:id/reverse', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;

    const existing = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: '交易记录不存在' });
    }
    if (existing.status !== 'completed') {
      return res.status(400).json({ error: '仅已完成的交易可红冲' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const reverseType = existing.type === 'income' ? 'expense' : 'income';
      const reverseCategory = existing.type === 'income' ? '退款支出' : '其他收入';

      const reversed = await createTransactionInTx(tx, {
        type: reverseType,
        category: reverseCategory,
        amount: existing.amount,
        description: `红冲 - ${existing.referenceNo || existing.id}`,
        remark: reason || `红冲原交易：${existing.description || ''}`,
        operator: req.adminUsername || 'admin',
        paymentMethod: existing.paymentMethod,
      });

      return reversed;
    });

    auditLog({
      action: 'REVERSE_TRANSACTION',
      entityId: req.params.id,
      entityType: 'transaction',
      operator: req.adminUsername,
    });

    res.json(result);
  } catch (error) {
    console.error('Reverse transaction error:', error);
    res.status(500).json({ error: '红冲交易失败' });
  }
});

// ============================================
// 余额调整（特殊操作，需管理员权限）
// ============================================
router.post('/balance-adjust', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { amount, reason, category = '其他收入' } = req.body;

    if (amount === undefined || amount === 0) {
      return res.status(400).json({ error: '调整金额不能为0' });
    }
    if (!reason) {
      return res.status(400).json({ error: '请填写调整原因' });
    }

    const type = amount > 0 ? 'income' : 'expense';
    const absAmount = Math.abs(amount);

    const transaction = await prisma.$transaction(async (tx) => {
      return createTransactionInTx(tx, {
        type,
        category,
        amount: absAmount,
        description: type === 'income' ? '余额调增' : '余额调减',
        remark: reason,
        operator: req.adminUsername || 'admin',
        paymentMethod: 'manual',
      });
    });

    auditLog({
      action: 'BALANCE_ADJUST',
      entityId: transaction.id,
      entityType: 'transaction',
      operator: req.adminUsername,
    });

    const result = await prisma.transaction.findUnique({
      where: { id: transaction.id },
    });

    res.json(result);
  } catch (error) {
    console.error('Balance adjust error:', error);
    res.status(500).json({ error: '余额调整失败' });
  }
});

// ============================================
// 删除交易记录（24小时内可删，删除后余额链重算）
// ============================================
router.delete('/transactions/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });
    if (!tx) {
      return res.status(404).json({ error: '交易记录不存在' });
    }

    const now = new Date();
    const created = new Date(tx.createdAt);
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      return res.status(403).json({ error: '超过24小时的交易记录不可删除，请使用红冲功能' });
    }

    await prisma.$transaction(async (prismaTx) => {
      const prevTx = await prismaTx.transaction.findFirst({
        where: {
          status: 'completed',
          createdAt: { lt: tx.createdAt },
        },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      });
      const prevBalance = prevTx?.balanceAfter || 0;

      await prismaTx.transaction.delete({
        where: { id: req.params.id },
      });

      await recalcBalanceFrom(prismaTx, tx.createdAt, prevBalance);
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
// 批量删除交易记录
// ============================================
router.post('/transactions/batch-delete', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的交易记录' });
    }

    const now = new Date();
    const transactions = await prisma.transaction.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'asc' },
    });

    for (const tx of transactions) {
      const hoursDiff = (now.getTime() - new Date(tx.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        return res.status(403).json({ error: `交易 ${tx.referenceNo || tx.id} 超过24小时，不可删除` });
      }
    }

    await prisma.$transaction(async (prismaTx) => {
      for (const tx of transactions) {
        const prevTx = await prismaTx.transaction.findFirst({
          where: {
            status: 'completed',
            createdAt: { lt: tx.createdAt },
            id: { notIn: ids },
          },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true },
        });
        const prevBalance = prevTx?.balanceAfter || 0;

        await prismaTx.transaction.delete({ where: { id: tx.id } });
        await recalcBalanceFrom(prismaTx, tx.createdAt, prevBalance);
      }
    });

    auditLog({
      action: 'BATCH_DELETE_TRANSACTIONS',
      entityId: ids.join(','),
      entityType: 'transaction',
      operator: req.adminUsername,
    });

    res.json({ message: `成功删除 ${ids.length} 条记录` });
  } catch (error) {
    console.error('Batch delete transactions error:', error);
    res.status(500).json({ error: '批量删除失败' });
  }
});

// ============================================
// 财务分类 CRUD
// ============================================
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const { type, includeInactive } = req.query;
    const where: any = {};
    if (type) where.type = type;
    if (!includeInactive || includeInactive === 'false') where.isActive = true;

    const categories = await prisma.financeCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(categories);
  } catch (error) {
    console.error('Get finance categories error:', error);
    res.status(500).json({ error: '获取财务分类失败' });
  }
});

router.post('/categories', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, type, icon, color, sortOrder } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: '请填写分类名称和类型' });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: '无效的分类类型' });
    }

    const existing = await prisma.financeCategory.findFirst({
      where: { name, type },
    });
    if (existing) {
      return res.status(400).json({ error: '该分类已存在' });
    }

    const maxSort = await prisma.financeCategory.aggregate({
      where: { type },
      _max: { sortOrder: true },
    });

    const category = await prisma.financeCategory.create({
      data: {
        name,
        type,
        icon: icon || null,
        color: color || '#999',
        sortOrder: sortOrder !== undefined ? sortOrder : (maxSort._max.sortOrder || 0) + 1,
        isSystem: false,
        isActive: true,
      },
    });

    auditLog({
      action: 'CREATE_CATEGORY',
      entityId: category.id,
      entityType: 'finance_category',
      operator: req.adminUsername,
    });

    res.json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: '创建分类失败' });
  }
});

router.put('/categories/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, icon, color, sortOrder, isActive } = req.body;

    const existing = await prisma.financeCategory.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: '分类不存在' });
    }
    if (existing.isSystem && name && name !== existing.name) {
      return res.status(403).json({ error: '系统内置分类不可修改名称' });
    }

    const category = await prisma.financeCategory.update({
      where: { id: req.params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        icon: icon !== undefined ? icon : existing.icon,
        color: color !== undefined ? color : existing.color,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    auditLog({
      action: 'UPDATE_CATEGORY',
      entityId: req.params.id,
      entityType: 'finance_category',
      operator: req.adminUsername,
    });

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: '更新分类失败' });
  }
});

router.delete('/categories/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.financeCategory.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: '分类不存在' });
    }
    if (existing.isSystem) {
      return res.status(403).json({ error: '系统内置分类不可删除' });
    }

    const usedCount = await prisma.transaction.count({
      where: { category: existing.name },
    });
    if (usedCount > 0) {
      return res.status(400).json({ error: `该分类已被 ${usedCount} 条交易使用，无法删除` });
    }

    await prisma.financeCategory.delete({
      where: { id: req.params.id },
    });

    auditLog({
      action: 'DELETE_CATEGORY',
      entityId: req.params.id,
      entityType: 'finance_category',
      operator: req.adminUsername,
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: '删除分类失败' });
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

    if (type === 'week' || type === 'month') {
      const aggregated: Record<string, { income: number; expense: number; date: string }> = {};
      for (const [key, val] of Object.entries(dailyData)) {
        const d = new Date(key);
        let aggKey: string;
        if (type === 'week') {
          const weekStart = new Date(d);
          const day = d.getDay();
          weekStart.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
          aggKey = weekStart.toISOString().split('T')[0];
        } else {
          aggKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        if (!aggregated[aggKey]) {
          aggregated[aggKey] = { date: aggKey, income: 0, expense: 0 };
        }
        aggregated[aggKey].income += val.income;
        aggregated[aggKey].expense += val.expense;
      }
      const result = Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date));
      return res.json(result);
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
    const { type = 'income', period = '30d' } = req.query as any;

    let startDate: Date;
    const now = new Date();

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === '7d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === '90d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
    } else if (period === '12m') {
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
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
// 订单统计（商品维度）
// ============================================
router.get('/order-stats', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query as any;

    let startDate: Date;
    const now = new Date();
    if (period === '7d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === '90d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
    } else if (period === '12m' || period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
    }

    const paidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'paid',
        deletedByUser: false,
        createdAt: { gte: startDate },
      },
      include: { items: true },
    });

    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    let totalOrders = paidOrders.length;
    let totalRevenue = 0;

    for (const order of paidOrders) {
      totalRevenue += order.total;
      for (const item of order.items) {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        productMap[item.productId].quantity += item.quantity;
        productMap[item.productId].revenue += item.price * item.quantity;
      }
    }

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 支付方式分布
    const payMethodMap: Record<string, number> = {};
    const paymentTx = await prisma.transaction.findMany({
      where: {
        type: 'income',
        category: '销售收入',
        status: 'completed',
        createdAt: { gte: startDate },
      },
      select: { paymentMethod: true, amount: true },
    });
    for (const tx of paymentTx) {
      const method = tx.paymentMethod || 'other';
      payMethodMap[method] = (payMethodMap[method] || 0) + tx.amount;
    }

    // 高峰时段分析
    const hourMap: Record<number, number> = {};
    for (const order of paidOrders) {
      const hour = new Date(order.createdAt).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    }

    res.json({
      totalOrders,
      totalRevenue,
      topProducts,
      paymentMethods: Object.entries(payMethodMap).map(([method, amount]) => ({ method, amount })),
      hourlyOrders: Object.entries(hourMap).map(([hour, count]) => ({ hour: parseInt(hour), count })),
    });
  } catch (error) {
    console.error('Order stats error:', error);
    res.status(500).json({ error: '获取订单统计失败' });
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
      startDate,
      endDate,
      page = '1',
      pageSize = '20',
      search,
    } = req.query as any;

    const where: any = {};
    if (type && type !== 'all') where.type = type;
    if (status && status !== 'all') where.status = status;
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate + 'T23:59:59') };
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
router.post('/invoices', adminAuthMiddleware, async (req: Request, res: Response) => {
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
    } = req.body;

    if (!type || !amount || amount <= 0) {
      return res.status(400).json({ error: '请填写完整的账单信息' });
    }
    if (!['sale', 'expense', 'refund'].includes(type)) {
      return res.status(400).json({ error: '无效的账单类型' });
    }

    const invoiceNo = generateInvoiceNo(type);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        type,
        amount,
        orderId: orderId || undefined,
        customerName,
        customerPhone,
        dueDate: dueDate ? new Date(dueDate) : null,
        items: items || null,
        remark,
        operator: req.adminUsername || 'admin',
        issuedAt: new Date(),
      },
      include: { order: true },
    });

    auditLog({
      action: 'CREATE_INVOICE',
      entityId: invoice.id,
      entityType: 'invoice',
      operator: req.adminUsername,
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
// 更新账单状态（支付/取消/退款）- 事务保证
// ============================================
router.patch('/invoices/:id/status', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, paymentMethod } = req.body;
    const validStatuses = ['unpaid', 'paid', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的账单状态' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });
    if (!invoice) {
      return res.status(404).json({ error: '账单不存在' });
    }

    if (invoice.status === status) {
      return res.status(400).json({ error: '账单状态未变更' });
    }

    const operator = req.adminUsername || 'admin';

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = { status };
      if (status === 'paid') updateData.paidAt = new Date();

      const updatedInvoice = await tx.invoice.update({
        where: { id: req.params.id },
        data: updateData,
      });

      // 未支付 → 已支付：生成交易记录
      if (status === 'paid' && invoice.status !== 'paid') {
        const txType = invoice.type === 'sale' ? 'income' : 'expense';
        const txCategory = invoice.type === 'sale' ? '销售收入'
          : invoice.type === 'expense' ? '其他支出'
          : '其他收入';

        await createTransactionInTx(tx, {
          type: txType,
          category: txCategory,
          amount: invoice.amount,
          orderId: invoice.orderId || undefined,
          invoiceId: invoice.id,
          description: `账单支付 - ${invoice.invoiceNo}`,
          referenceNo: generateReferenceNo(),
          operator,
          paymentMethod: paymentMethod || 'cash',
        });
      }

      // 已支付 → 已退款：生成反向冲销交易
      if (status === 'refunded' && invoice.status === 'paid') {
        await createTransactionInTx(tx, {
          type: 'expense',
          category: '退款支出',
          amount: invoice.amount,
          orderId: invoice.orderId || undefined,
          invoiceId: invoice.id,
          description: `账单退款 - ${invoice.invoiceNo}`,
          remark: '账单退款冲销',
          referenceNo: generateReferenceNo(),
          operator,
          paymentMethod: paymentMethod || 'cash',
        });
      }

      // 已支付 → 已取消：生成反向冲销交易
      if (status === 'cancelled' && invoice.status === 'paid') {
        await createTransactionInTx(tx, {
          type: invoice.type === 'sale' ? 'expense' : 'income',
          category: invoice.type === 'sale' ? '退款支出' : '其他收入',
          amount: invoice.amount,
          orderId: invoice.orderId || undefined,
          invoiceId: invoice.id,
          description: `账单取消冲销 - ${invoice.invoiceNo}`,
          remark: '账单取消，已冲销原交易',
          referenceNo: generateReferenceNo(),
          operator,
        });
      }

      return updatedInvoice;
    });

    auditLog({
      action: 'UPDATE_INVOICE_STATUS',
      entityId: req.params.id,
      entityType: 'invoice',
      operator: req.adminUsername,
    });

    const result = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { order: true },
    });

    res.json(result);
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({ error: '更新账单状态失败' });
  }
});

// ============================================
// 删除账单
// ============================================
router.delete('/invoices/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });
    if (!invoice) {
      return res.status(404).json({ error: '账单不存在' });
    }

    if (invoice.status === 'paid' || invoice.status === 'refunded') {
      return res.status(403).json({ error: '已支付或已退款的账单不可删除' });
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
// 财务报表（多维度：日/周/月/季/年）
// ============================================
router.get('/report/:granularity', async (req: Request, res: Response) => {
  try {
    const { granularity } = req.params;
    const { startDate, endDate, year } = req.query as any;

    if (!['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(granularity)) {
      return res.status(400).json({ error: '无效的报表粒度' });
    }

    let start: Date, end: Date;
    const now = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate + 'T23:59:59');
    } else if (granularity === 'daily') {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      end = now;
    } else if (granularity === 'weekly') {
      start = new Date(now);
      start.setDate(now.getDate() - 84);
      end = now;
    } else if (granularity === 'monthly') {
      const targetYear = year ? parseInt(year) : now.getFullYear();
      start = new Date(targetYear, 0, 1);
      end = new Date(targetYear, 11, 31, 23, 59, 59);
    } else if (granularity === 'quarterly') {
      const targetYear = year ? parseInt(year) : now.getFullYear();
      start = new Date(targetYear, 0, 1);
      end = new Date(targetYear, 11, 31, 23, 59, 59);
    } else {
      start = new Date(now.getFullYear() - 4, 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });

    const periodMap: Record<string, { period: string; income: number; expense: number; profit: number; orderCount: number; orderTotal: number }> = {};

    for (const tx of transactions) {
      const d = new Date(tx.createdAt);
      let key: string;
      if (granularity === 'daily') {
        key = d.toISOString().split('T')[0];
      } else if (granularity === 'weekly') {
        const weekStart = new Date(d);
        const day = d.getDay();
        weekStart.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
        key = weekStart.toISOString().split('T')[0];
      } else if (granularity === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (granularity === 'quarterly') {
        const q = Math.floor(d.getMonth() / 3) + 1;
        key = `${d.getFullYear()}-Q${q}`;
      } else {
        key = `${d.getFullYear()}`;
      }

      if (!periodMap[key]) {
        periodMap[key] = { period: key, income: 0, expense: 0, profit: 0, orderCount: 0, orderTotal: 0 };
      }
      if (tx.type === 'income') periodMap[key].income += tx.amount;
      else if (tx.type === 'expense') periodMap[key].expense += tx.amount;
    }

    const paidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'paid',
        deletedByUser: false,
        createdAt: { gte: start, lte: end },
      },
      select: { total: true, createdAt: true },
    });

    for (const order of paidOrders) {
      const d = new Date(order.createdAt);
      let key: string;
      if (granularity === 'daily') {
        key = d.toISOString().split('T')[0];
      } else if (granularity === 'weekly') {
        const weekStart = new Date(d);
        const day = d.getDay();
        weekStart.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
        key = weekStart.toISOString().split('T')[0];
      } else if (granularity === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (granularity === 'quarterly') {
        const q = Math.floor(d.getMonth() / 3) + 1;
        key = `${d.getFullYear()}-Q${q}`;
      } else {
        key = `${d.getFullYear()}`;
      }

      if (periodMap[key]) {
        periodMap[key].orderCount += 1;
        periodMap[key].orderTotal += order.total;
      }
    }

    const periods = Object.values(periodMap)
      .map(p => ({
        ...p,
        profit: p.income - p.expense,
        profitRate: p.income > 0 ? Math.round(((p.income - p.expense) / p.income) * 1000) / 10 : 0,
        avgOrderPrice: p.orderCount > 0 ? Math.round(p.orderTotal / p.orderCount) : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const totalIncome = periods.reduce((s, p) => s + p.income, 0);
    const totalExpense = periods.reduce((s, p) => s + p.expense, 0);
    const totalProfit = totalIncome - totalExpense;
    const totalOrders = periods.reduce((s, p) => s + p.orderCount, 0);
    const totalOrderRevenue = periods.reduce((s, p) => s + p.orderTotal, 0);

    res.json({
      granularity,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      periods,
      summary: {
        totalIncome,
        totalExpense,
        totalProfit,
        profitRate: totalIncome > 0 ? Math.round((totalProfit / totalIncome) * 1000) / 10 : 0,
        totalOrders,
        totalOrderRevenue,
        avgOrderPrice: totalOrders > 0 ? Math.round(totalOrderRevenue / totalOrders) : 0,
      },
    });
  } catch (error) {
    console.error('Finance report error:', error);
    res.status(500).json({ error: '获取财务报表失败' });
  }
});

// ============================================
// 财务报表（分类维度）
// ============================================
router.get('/report/by-category', async (req: Request, res: Response) => {
  try {
    const { type = 'income', startDate, endDate } = req.query as any;

    const where: any = {
      type: type as string,
      status: 'completed',
    };
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate + 'T23:59:59') };

    const transactions = await prisma.transaction.findMany({ where });
    const categories = await prisma.financeCategory.findMany({ where: { type: type as string } });

    const catMap: Record<string, { category: string; amount: number; count: number; percentage: number; color?: string; icon?: string }> = {};
    let total = 0;

    for (const tx of transactions) {
      if (!catMap[tx.category]) {
        const catInfo = categories.find(c => c.name === tx.category);
        catMap[tx.category] = {
          category: tx.category,
          amount: 0,
          count: 0,
          percentage: 0,
          color: catInfo?.color,
          icon: catInfo?.icon,
        };
      }
      catMap[tx.category].amount += tx.amount;
      catMap[tx.category].count += 1;
      total += tx.amount;
    }

    const list = Object.values(catMap).map(c => ({
      ...c,
      percentage: total > 0 ? Math.round((c.amount / total) * 1000) / 10 : 0,
    })).sort((a, b) => b.amount - a.amount);

    res.json({ total, list });
  } catch (error) {
    console.error('Category report error:', error);
    res.status(500).json({ error: '获取分类报表失败' });
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
      tx.type === 'income' ? '收入' : tx.type === 'expense' ? '支出' : '转账',
      tx.category || '',
      (tx.amount / 100).toFixed(2),
      (tx.balanceAfter / 100).toFixed(2),
      tx.status === 'completed' ? '已完成' : tx.status === 'pending' ? '待处理' : tx.status === 'failed' ? '失败' : '已取消',
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
    const encodedFilename = encodeURIComponent(filename);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
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
// 导出财务报表 CSV
// ============================================
router.get('/report/:granularity/export/csv', async (req: Request, res: Response) => {
  try {
    const { granularity } = req.params;
    const { startDate, endDate, year } = req.query as any;

    let start: Date, end: Date;
    const now = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate + 'T23:59:59');
    } else if (granularity === 'monthly') {
      const targetYear = year ? parseInt(year) : now.getFullYear();
      start = new Date(targetYear, 0, 1);
      end = new Date(targetYear, 11, 31, 23, 59, 59);
    } else {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      end = now;
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });

    const periodMap: Record<string, { period: string; income: number; expense: number; orderCount: number; orderTotal: number }> = {};

    for (const tx of transactions) {
      const d = new Date(tx.createdAt);
      let key: string;
      if (granularity === 'daily') key = d.toISOString().split('T')[0];
      else if (granularity === 'weekly') {
        const weekStart = new Date(d);
        const day = d.getDay();
        weekStart.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
        key = weekStart.toISOString().split('T')[0];
      } else if (granularity === 'monthly') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      else if (granularity === 'quarterly') {
        const q = Math.floor(d.getMonth() / 3) + 1;
        key = `${d.getFullYear()}-Q${q}`;
      } else key = `${d.getFullYear()}`;

      if (!periodMap[key]) periodMap[key] = { period: key, income: 0, expense: 0, orderCount: 0, orderTotal: 0 };
      if (tx.type === 'income') periodMap[key].income += tx.amount;
      else if (tx.type === 'expense') periodMap[key].expense += tx.amount;
    }

    const paidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'paid',
        deletedByUser: false,
        createdAt: { gte: start, lte: end },
      },
      select: { total: true, createdAt: true },
    });

    for (const order of paidOrders) {
      const d = new Date(order.createdAt);
      let key: string;
      if (granularity === 'daily') key = d.toISOString().split('T')[0];
      else if (granularity === 'weekly') {
        const weekStart = new Date(d);
        const day = d.getDay();
        weekStart.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
        key = weekStart.toISOString().split('T')[0];
      } else if (granularity === 'monthly') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      else if (granularity === 'quarterly') {
        const q = Math.floor(d.getMonth() / 3) + 1;
        key = `${d.getFullYear()}-Q${q}`;
      } else key = `${d.getFullYear()}`;

      if (periodMap[key]) {
        periodMap[key].orderCount += 1;
        periodMap[key].orderTotal += order.total;
      }
    }

    const periods = Object.values(periodMap).sort((a, b) => a.period.localeCompare(b.period));

    const headers = ['期间', '收入', '支出', '利润', '利润率', '订单数', '订单总额', '客单价'];
    const rows = periods.map(p => {
      const profit = p.income - p.expense;
      return [
        p.period,
        (p.income / 100).toFixed(2),
        (p.expense / 100).toFixed(2),
        (profit / 100).toFixed(2),
        p.income > 0 ? (profit / p.income * 100).toFixed(1) + '%' : '0%',
        p.orderCount,
        (p.orderTotal / 100).toFixed(2),
        p.orderCount > 0 ? (p.orderTotal / 100 / p.orderCount).toFixed(2) : '0.00',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const filename = `财务报表_${granularity}_${new Date().toISOString().split('T')[0]}.csv`;
    const encodedFilename = encodeURIComponent(filename);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', Buffer.byteLength('\uFEFF' + csvContent, 'utf8'));

    res.write('\uFEFF');
    res.write(csvContent);
    res.end();
  } catch (error) {
    console.log('Export report error:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

// ============================================
// 导出账单 CSV
// ============================================
router.get('/invoices/export/csv', async (req: Request, res: Response) => {
  try {
    const {
      type,
      status,
      startDate,
      endDate,
      search,
    } = req.query as any;

    const where: any = {};
    if (type && type !== 'all') where.type = type;
    if (status && status !== 'all') where.status = status;
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate + 'T23:59:59') };
    if (search) {
      where.OR = [
        { invoiceNo: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });

    const typeMap: Record<string, string> = { sale: '销售账单', expense: '支出账单', refund: '退款账单' };
    const statusMap: Record<string, string> = { unpaid: '未支付', paid: '已支付', cancelled: '已取消', refunded: '已退款' };

    const headers = [
      '账单号', '类型', '金额', '状态', '客户名称', '联系电话',
      '关联订单号', '开票日期', '支付时间', '到期日期', '操作人', '备注', '创建时间'
    ];

    const rows = invoices.map(inv => [
      inv.invoiceNo || '',
      typeMap[inv.type] || inv.type,
      (inv.amount / 100).toFixed(2),
      statusMap[inv.status] || inv.status,
      inv.customerName || '',
      inv.customerPhone || '',
      inv.order?.orderNo || '',
      inv.issuedAt ? new Date(inv.issuedAt).toLocaleString('zh-CN') : '',
      inv.paidAt ? new Date(inv.paidAt).toLocaleString('zh-CN') : '',
      inv.dueDate ? new Date(inv.dueDate).toLocaleString('zh-CN') : '',
      inv.operator || '',
      inv.remark || '',
      new Date(inv.createdAt).toLocaleString('zh-CN'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const filename = `账单列表_${new Date().toISOString().split('T')[0]}.csv`;
    const encodedFilename = encodeURIComponent(filename);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', Buffer.byteLength('\uFEFF' + csvContent, 'utf8'));

    res.write('\uFEFF');
    res.write(csvContent);
    res.end();
  } catch (error) {
    console.error('Export invoices error:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

export default router;
