import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      phone?: string;
      adminId?: string;
      adminUsername?: string;
      params: {
        [key: string]: string;
      };
    }
  }
}

export {};
