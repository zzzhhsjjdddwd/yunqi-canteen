import { Router } from 'express';
import { prisma } from '../app.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 获取全部商品 (公开)
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: '获取商品失败' });
  }
});

// 获取单个商品 (公开)
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: '获取商品失败' });
  }
});

// 创建商品 (需认证)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, categoryId, price, description, image, status, sortOrder } = req.body;
    if (!name || !categoryId || !price) {
      return res.status(400).json({ error: '名称、分类和价格不能为空' });
    }
    const product = await prisma.product.create({
      data: {
        name,
        categoryId,
        price: Math.round(price * 100),
        description,
        image,
        status: status || 'active',
        sortOrder: sortOrder || 0,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: '创建商品失败' });
  }
});

// 更新商品 (需认证)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, categoryId, price, description, image, status, sortOrder } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        categoryId,
        price: price !== undefined ? Math.round(price * 100) : undefined,
        description,
        image,
        status,
        sortOrder,
      },
    });
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: '更新商品失败' });
  }
});

// 删除商品 (需认证)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: '删除商品失败' });
  }
});

export default router;
