import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export function adminOnlyMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      adminId?: string;
      username?: string;
      userId?: string;
      phone?: string;
    };

    if (!decoded.adminId) {
      return res.status(403).json({ error: '无权限' });
    }

    req.adminId = decoded.adminId;
    req.adminUsername = decoded.username;
    next();
  } catch {
    return res.status(401).json({ error: 'Token无效或已过期' });
  }
}
