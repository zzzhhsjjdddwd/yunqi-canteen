import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cloud-eats-secret-key-2024') as {
      adminId?: string;
      username?: string;
      userId?: string;
      phone?: string;
    };

    // 支持管理员 token 和用户 token
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
