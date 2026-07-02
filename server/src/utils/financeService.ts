import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export function generateReferenceNo(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TX${y}${m}${d}${rand}`;
}

export function generateInvoiceNo(type: string): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const prefix = type === 'sale' ? 'INV' : type === 'expense' ? 'EXP' : 'REF';
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${y}${m}${d}${rand}`;
}

export function auditLog(entry: { action: string; entityId: string; entityType: string; operator?: string }) {
  console.log(JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
  }));
}

export async function getCurrentBalance(tx?: Prisma.TransactionClient): Promise<number> {
  const client = tx || prisma;
  const lastTx = await client.transaction.findFirst({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true },
  });
  return lastTx?.balanceAfter || 0;
}

export interface CreateTransactionData {
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  orderId?: string;
  invoiceId?: string;
  description?: string;
  remark?: string;
  operator?: string;
  paymentMethod?: string;
  referenceNo?: string;
  status?: string;
}

export async function createTransactionInTx(tx: Prisma.TransactionClient, data: CreateTransactionData) {
  const lastTx = await tx.transaction.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true },
  });
  const currentBalance = lastTx?.balanceAfter || 0;
  const newBalance = data.type === 'income'
    ? currentBalance + data.amount
    : currentBalance - data.amount;

  return tx.transaction.create({
    data: {
      type: data.type,
      category: data.category,
      amount: data.amount,
      balanceAfter: newBalance,
      orderId: data.orderId,
      invoiceId: data.invoiceId,
      description: data.description,
      remark: data.remark,
      operator: data.operator || 'admin',
      referenceNo: data.referenceNo || generateReferenceNo(),
      paymentMethod: data.paymentMethod,
      status: data.status || 'completed',
    },
  });
}

export async function recalcBalanceFrom(tx: Prisma.TransactionClient, fromDate: Date, startBalance: number) {
  const subsequent = await tx.transaction.findMany({
    where: {
      status: 'completed',
      createdAt: { gte: fromDate },
    },
    orderBy: { createdAt: 'asc' },
  });

  let balance = startBalance;
  for (const trans of subsequent) {
    balance = trans.type === 'income'
      ? balance + trans.amount
      : balance - trans.amount;
    await tx.transaction.update({
      where: { id: trans.id },
      data: { balanceAfter: balance },
    });
  }
}

export async function initFinanceCategories() {
  const count = await prisma.financeCategory.count();
  if (count > 0) return;

  const categories = [
    { name: '销售收入', type: 'income', icon: 'shopping-bag', color: '#6BA88A', sortOrder: 1, isSystem: true },
    { name: '其他收入', type: 'income', icon: 'plus-circle', color: '#5BA3A3', sortOrder: 2, isSystem: true },
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
