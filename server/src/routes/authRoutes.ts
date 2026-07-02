import { Router } from 'express';
import { prisma } from '../app.js';
import { SECRET } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getFullUrl } from '../utils/url.js';

const router = Router();

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { phone, password, nickname } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(400).json({ error: '该手机号已注册' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        nickname: nickname || `用户${phone.slice(-4)}`,
      },
    });

    // 生成token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: getFullUrl(req, user.avatar),
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    // 生成token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: getFullUrl(req, user.avatar),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 登录注册一体化
router.post('/auth', async (req, res) => {
  try {
    const { phone, password, nickname } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    // 查找用户
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      // 用户已存在，验证密码并登录
      const validPassword = await bcrypt.compare(password, existingUser.password);
      if (!validPassword) {
        return res.status(401).json({ error: '密码错误' });
      }

      const token = jwt.sign(
        { userId: existingUser.id, phone: existingUser.phone },
        SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        token,
        user: {
          id: existingUser.id,
          phone: existingUser.phone,
          nickname: existingUser.nickname,
          avatar: getFullUrl(req, existingUser.avatar),
        },
        isNewUser: false,
      });
    } else {
      // 用户不存在，创建新用户并登录
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          phone,
          password: hashedPassword,
          nickname: nickname || `用户${phone.slice(-4)}`,
        },
      });

      const token = jwt.sign(
        { userId: user.id, phone: user.phone },
        SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          avatar: getFullUrl(req, user.avatar),
        },
        isNewUser: true,
      });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: '操作失败' });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      ...user,
      avatar: getFullUrl(req, user.avatar),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'token无效' });
  }
});

// 更新用户信息
router.patch('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET) as { userId: string };

    const { nickname, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        nickname,
        avatar,
      },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true,
      },
    });

    res.json({
      ...user,
      avatar: getFullUrl(req, user.avatar),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

export default router;
