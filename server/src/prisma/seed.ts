import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('Missing required environment variable: ADMIN_PASSWORD');
  }

  const existingAdmin = await prisma.admin.findUnique({ where: { username: 'admin' } });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
      },
    });
  }

  // 创建分类
  const drinks = await prisma.category.upsert({
    where: { id: 'cat_drinks' },
    update: {},
    create: {
      id: 'cat_drinks',
      name: '饮品',
      sortOrder: 1,
    },
  });

  const lightFood = await prisma.category.upsert({
    where: { id: 'cat_lightfood' },
    update: {},
    create: {
      id: 'cat_lightfood',
      name: '轻食',
      sortOrder: 2,
    },
  });

  const snacks = await prisma.category.upsert({
    where: { id: 'cat_snacks' },
    update: {},
    create: {
      id: 'cat_snacks',
      name: '小食',
      sortOrder: 3,
    },
  });

  const products = [
    { id: 'prod_milktea', name: '招牌奶茶', categoryId: drinks.id, price: 1800, description: '精选高山乌龙茶底', image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=400', status: 'active', sortOrder: 1 },
    { id: 'prod_orange', name: '鲜榨橙汁', categoryId: drinks.id, price: 1200, description: '新鲜橙子现榨', image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400', status: 'active', sortOrder: 2 },
    { id: 'prod_matcha', name: '抹茶拿铁', categoryId: drinks.id, price: 2200, description: '日式宇治抹茶', image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400', status: 'active', sortOrder: 3 },
    { id: 'prod_lemon', name: '柠檬蜂蜜水', categoryId: drinks.id, price: 1500, description: '清爽解腻', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', status: 'active', sortOrder: 4 },
    { id: 'prod_oatmeal', name: '燕麦酸奶碗', categoryId: lightFood.id, price: 2800, description: '有机燕麦+新鲜水果', image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=400', status: 'active', sortOrder: 1 },
    { id: 'prod_salad', name: '藜麦沙拉', categoryId: lightFood.id, price: 3200, description: '超级食材组合', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', status: 'active', sortOrder: 2 },
    { id: 'prod_avocado', name: '牛油果吐司', categoryId: lightFood.id, price: 2500, description: '健康早餐首选', image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400', status: 'active', sortOrder: 3 },
    { id: 'prod_fries', name: '薯条', categoryId: snacks.id, price: 1200, description: '金黄酥脆', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', status: 'active', sortOrder: 1 },
    { id: 'prod_chicken', name: '鸡米花', categoryId: snacks.id, price: 1800, description: '外酥里嫩', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400', status: 'active', sortOrder: 2 },
    { id: 'prod_onion', name: '洋葱圈', categoryId: snacks.id, price: 1500, description: '香脆可口', image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400', status: 'inactive', sortOrder: 3 },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: {
        ...product,
      },
    });
  }

  // 创建设置
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      speakerEnabled: true,
      speakerVolume: 80,
      speakerNewOrderText: '新订单来了',
      speakerPaymentFailedText: '客户支付失败',
    },
  });

  console.log('数据库初始化完成!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
