// @ts-nocheck
import { Router } from 'express';
import { prisma } from '../app.js';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cloud-eats-secret-key-2024';

// Middleware to verify admin token
const adminAuth = (req: any, res: any, next: () => void) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string };
    req.adminId = decoded.adminId;
    next();
  } catch {
    return res.status(401).json({ error: 'token无效' });
  }
};

// Get all users (with pagination and search)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = '1', limit = '20', search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = search
      ? {
          OR: [
            { phone: { contains: search as string } },
            { nickname: { contains: search as string } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { orders: true, addresses: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users: users.map((u: any) => ({
        id: u.id,
        phone: u.phone,
        nickname: u.nickname,
        avatar: u.avatar,
        createdAt: u.createdAt,
        orderCount: u._count.orders,
        addressCount: u._count.addresses,
      })),
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// Get user detail
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        addresses: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: true },
        },
        _count: {
          select: { orders: true, addresses: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      createdAt: user.createdAt,
      addresses: user.addresses,
      recentOrders: user.orders,
      orderCount: user._count.orders,
      addressCount: user._count.addresses,
    });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({ error: '获取用户详情失败' });
  }
});

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id },
    });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// Get user statistics
router.get('/users/stats/summary', adminAuth, async (req, res) => {
  try {
    const [totalUsers, usersWithOrders, totalAddresses] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { orders: { some: {} } },
      }),
      prisma.address.count(),
    ]);

    res.json({
      totalUsers,
      usersWithOrders,
      totalAddresses,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

export default router;