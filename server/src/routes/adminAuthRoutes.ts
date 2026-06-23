import { Router } from 'express';
import { prisma } from '../app.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cloud-eats-secret-key-2024';

// 管理员登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { adminId: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取管理员信息
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string };

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
      select: { id: true, username: true },
    });

    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }

    res.json(admin);
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(401).json({ error: 'token无效' });
  }
});

export default router;
