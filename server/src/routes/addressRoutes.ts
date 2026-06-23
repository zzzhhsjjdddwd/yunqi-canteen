import { Router } from 'express';
import { prisma } from '../app.js';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cloud-eats-secret-key-2024';

// 验证token中间件
const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'token无效' });
  }
};

// 获取用户所有地址
router.get('/', authMiddleware, async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(addresses);
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: '获取地址失败' });
  }
});

// 添加地址
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, phone, province, city, district, detail, isDefault } = req.body;

    if (!name || !phone || !province || !city || !district || !detail) {
      return res.status(400).json({ error: '地址信息不完整' });
    }

    // 如果设为默认，先取消其他默认
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.userId,
        name,
        phone,
        province,
        city,
        district,
        detail,
        isDefault: isDefault || false,
      },
    });

    res.json(address);
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ error: '添加地址失败' });
  }
});

// 更新地址
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, province, city, district, detail, isDefault } = req.body;

    // 验证地址属于当前用户
    const existing = await prisma.address.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: '地址不存在' });
    }

    // 如果设为默认，先取消其他默认
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        name,
        phone,
        province,
        city,
        district,
        detail,
        isDefault,
      },
    });

    res.json(address);
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: '更新地址失败' });
  }
});

// 删除地址
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // 验证地址属于当前用户
    const existing = await prisma.address.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: '地址不存在' });
    }

    await prisma.address.delete({ where: { id } });

    // 如果删除的是默认地址，设为另一个为默认
    if (existing.isDefault) {
      const another = await prisma.address.findFirst({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' },
      });
      if (another) {
        await prisma.address.update({
          where: { id: another.id },
          data: { isDefault: true },
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: '删除地址失败' });
  }
});

// 设置默认地址
router.patch('/:id/default', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // 验证地址属于当前用户
    const existing = await prisma.address.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: '地址不存在' });
    }

    // 取消其他默认
    await prisma.address.updateMany({
      where: { userId: req.userId, isDefault: true },
      data: { isDefault: false },
    });

    // 设为默认
    const address = await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    res.json(address);
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({ error: '设置默认地址失败' });
  }
});

export default router;
