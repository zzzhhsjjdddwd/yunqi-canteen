// @ts-nocheck
import { Router } from 'express';
import { prisma } from '../app.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { adminOnlyMiddleware } from '../middleware/adminOnly.js';

const router = Router();

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
router.get('/me', adminOnlyMiddleware, async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.adminId },
      select: { id: true, username: true },
    });

    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }

    res.json(admin);
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({ error: '获取管理员信息失败' });
  }
});

export default router;
