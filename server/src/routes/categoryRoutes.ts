// @ts-nocheck
import { Router } from 'express';
import { prisma } from '../app.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 获取全部分类 (公开)
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// 获取单个分类 (公开)
router.get('/:id', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
    });
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }
    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// 创建分类 (需认证)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, sortOrder } = req.body;
    if (!name) {
      return res.status(400).json({ error: '分类名称不能为空' });
    }
    const category = await prisma.category.create({
      data: { name, sortOrder: sortOrder || 0 },
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: '创建分类失败' });
  }
});

// 更新分类 (需认证)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, sortOrder } = req.body;
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name, sortOrder },
    });
    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: '更新分类失败' });
  }
});

// 删除分类 (需认证)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // 检查分类下是否有商品
    const products = await prisma.product.count({
      where: { categoryId: req.params.id },
    });
    if (products > 0) {
      return res.status(400).json({ error: '该分类下有商品，无法删除' });
    }
    await prisma.category.delete({
      where: { id: req.params.id },
    });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: '删除分类失败' });
  }
});

export default router;
