import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { SECRET } from '../middleware/auth.js';

interface ClientSocket extends Socket {
  room?: string;
  userId?: string;
  adminId?: string;
}

export function setupSocket(io: Server) {
  io.on('connection', (socket: ClientSocket) => {
    console.log('Client connected:', socket.id);

    // 从 query 中读取 token 并解析用户身份（用于浏览器场景）
    try {
      const token = (socket.handshake.query?.token as string) || (socket.handshake.auth?.token as string);
      if (token) {
        const decoded = jwt.verify(
          token,
SECRET
        ) as { adminId?: string; userId?: string };
        if (decoded.adminId) socket.adminId = decoded.adminId;
        if (decoded.userId) {
          socket.userId = decoded.userId;
          // 登录用户自动加入 user:<id> 房间，便于服务端定向推送
          socket.join(`user:${decoded.userId}`);
        }
      }
    } catch (err) {
      // token 无效忽略，按匿名处理
    }

    // 客户端加入房间（兼容旧的客户端调用）
    socket.on('join:client', () => {
      socket.join('client');
      console.log('Client joined client room:', socket.id);
    });

    // 管理端加入房间
    socket.on('join:admin', () => {
      socket.join('admin');
      console.log('Admin joined admin room:', socket.id);
    });

    // 用户加入自己的房间（兼容旧客户端调用 join:user with payload）
    socket.on('join:user', (payload: { userId?: string } | string) => {
      const userId = typeof payload === 'string' ? payload : payload?.userId;
      if (userId) {
        socket.userId = userId;
        socket.join(`user:${userId}`);
        console.log('User joined user room:', userId, socket.id);
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  console.log('Socket.IO server initialized');
}
