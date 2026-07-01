import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('⚠️  警告：JWT_SECRET 环境变量未设置，使用开发环境默认密钥。生产环境请务必设置！');
}
const SECRET = JWT_SECRET || 'dev-secret-key-change-in-production';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, SECRET) as {
      adminId?: string;
      username?: string;
      userId?: string;
      phone?: string;
    };

    if (decoded.adminId) {
      req.adminId = decoded.adminId;
      req.adminUsername = decoded.username;
    }
    if (decoded.userId) {
      req.userId = decoded.userId;
      req.phone = decoded.phone;
    }

    next();
  } catch {
    return res.status(401).json({ error: 'Token无效或已过期' });
  }
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, SECRET) as {
      adminId?: string;
      username?: string;
    };

    if (!decoded.adminId) {
      return res.status(403).json({ error: '权限不足，需要管理员身份' });
    }

    req.adminId = decoded.adminId;
    req.adminUsername = decoded.username;

    next();
  } catch {
    return res.status(401).json({ error: 'Token无效或已过期' });
  }
}
