import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { upload } from './utils/upload.js';
import { setupSocket } from './socket/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { getCorsAllowedOrigins, NODE_ENV } from './config/env.js';
import { adminOnlyMiddleware } from './middleware/adminOnly.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const app = express();
const httpServer = createServer(app);

const allowedOrigins = getCorsAllowedOrigins();

export const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || NODE_ENV === 'development') {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: false,
  },
  // Ping configuration for production (important for Heroku/Render idle connections)
  pingTimeout: 60000,
  pingInterval: 25000,
});

// CORS middleware for Express
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Static files for client and admin
app.use('/admin', express.static(path.join(__dirname, '../../dist-static/admin')));
app.use('/', express.static(path.join(__dirname, '../../dist-static/client')));

// Health check endpoint (required for Render/other hosts)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import financeRoutes from './routes/financeRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin/orders', adminOnlyMiddleware, orderRoutes);
app.use('/api/admin/products', productRoutes);
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/finance', adminOnlyMiddleware, financeRoutes);
app.use('/api/settings', settingsRoutes);

// Socket setup
setupSocket(io);

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// SPA fallback for React Router - must be AFTER all API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/admin')) {
    res.sendFile(path.join(__dirname, '../../dist-static/admin', 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, '../../dist-static/client', 'index.html'));
  }
});

export { app, httpServer, upload };
