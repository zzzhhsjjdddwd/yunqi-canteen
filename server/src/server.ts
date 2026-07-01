import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { app, httpServer } from './app.js';
import { prisma } from './app.js';
import bcrypt from 'bcryptjs';
import { assertStartupEnv, IS_PROD } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const PORT = process.env.PORT || 3001;

async function seedDatabase() {
  console.log('Initializing database...');

  const existingAdmin = await prisma.admin.findUnique({ where: { username: 'admin' } });
  if (!existingAdmin) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      throw new Error('Missing required environment variable: ADMIN_PASSWORD (required to create initial admin account)');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
      },
    });
    console.log('Admin account created');
  } else {
    console.log('Admin account exists');
  }
  
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      notificationEnabled: true,
      speakerEnabled: true,
      speakerVolume: 80,
      speakerNewOrderText: '新订单来了',
      speakerCancelledText: '客户取消订单',
      speakerPaymentFailedText: '客户支付失败',
    },
  });
  console.log('Settings initialized');
  
  const existingCategories = await prisma.category.count();
  if (existingCategories === 0) {
    if (IS_PROD && process.env.BOOTSTRAP_SAMPLE_DATA !== 'true') {
      console.log('Skipping sample data bootstrap in production');
      return;
    }
    const drinks = await prisma.category.create({ data: { id: 'cat_drinks', name: '饮品', sortOrder: 1 } });
    const lightFood = await prisma.category.create({ data: { id: 'cat_lightfood', name: '轻食', sortOrder: 2 } });
    const snacks = await prisma.category.create({ data: { id: 'cat_snacks', name: '小食', sortOrder: 3 } });
    
    const products = [
      { id: 'prod_milktea', name: '招牌奶茶', categoryId: drinks.id, price: 1800, description: '精选高山乌龙茶底', image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=400', status: 'active', sortOrder: 1 },
      { id: 'prod_orange', name: '鲜榨橙汁', categoryId: drinks.id, price: 1200, description: '新鲜橙子现榨', image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400', status: 'active', sortOrder: 2 },
      { id: 'prod_matcha', name: '抹茶拿铁', categoryId: drinks.id, price: 2200, description: '日式宇治抹茶', image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400', status: 'active', sortOrder: 3 },
      { id: 'prod_oatmeal', name: '燕麦酸奶碗', categoryId: lightFood.id, price: 2800, description: '有机燕麦+新鲜水果', image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=400', status: 'active', sortOrder: 1 },
      { id: 'prod_salad', name: '藜麦沙拉', categoryId: lightFood.id, price: 3200, description: '超级食材组合', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', status: 'active', sortOrder: 2 },
      { id: 'prod_fries', name: '薯条', categoryId: snacks.id, price: 1200, description: '金黄酥脆', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', status: 'active', sortOrder: 1 },
    ];
    for (const p of products) {
      await prisma.product.create({ data: p });
    }
    console.log('Sample data created');
  }
}

async function main() {
  try {
    assertStartupEnv();
    await prisma.$connect();
    console.log('Database connected successfully');
    
    await seedDatabase();

    httpServer.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`WebSocket server is ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
