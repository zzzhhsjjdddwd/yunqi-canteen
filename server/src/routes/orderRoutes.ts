// @ts-nocheck
import { Router, Request, Response, NextFunction } from "express";
import { prisma, io } from "../app.js";
import { adminOnlyMiddleware } from "../middleware/adminOnly.js";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { JWT_SECRET } from "../config/env.js";

const router = Router();

// 生成订单号
function generateOrderNo() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return "ORD" + dateStr + random;
}

// 可选鉴权中间件：有 token 就解析，没有也不报错
function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as { adminId?: string; username?: string; userId?: string; phone?: string };
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
    // token 无效时按匿名处理，不阻断请求
    next();
  }
}

// 创建订单 (公开，可选用户ID)
router.post("/", async (req, res) => {
  try {
    const { items, total, remark, userId, addressId } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "订单商品不能为空" });
    }
    if (!total) {
      return res.status(400).json({ error: "订单金额不能为空" });
    }
    if (addressId) {
      const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
      if (!address) { return res.status(400).json({ error: "地址不存在" }); }
    }
    const orderNo = generateOrderNo();
    const order = await prisma.order.create({
      data: {
        orderNo, total: Math.round(total), status: "pending", paymentStatus: "unpaid",
        remark, userId, addressId,
        items: { create: items.map((item: any) => ({ productId: item.productId, productName: item.productName, price: Math.round(item.price), quantity: item.quantity })) },
      },
      include: { items: true, address: { select: { id: true, name: true, phone: true, province: true, city: true, district: true, detail: true } }, user: { select: { id: true, nickname: true, phone: true, avatar: true } } },
    });
    io.to("admin").emit("order:create", { orderId: order.id, orderNo: order.orderNo, items: order.items, total: order.total, remark: order.remark, createdAt: order.createdAt, address: order.address, user: order.user });
    res.status(201).json(order);
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: "创建订单失败" });
  }
});

// ====== 客户端公开接口 ======

// 客户端订单列表 (可选鉴权)
// - 管理员请求交给下面的管理端 handler (next('route'))
// - 有 user token: 返回该用户的订单
// - 无 token / token 无效: 返回空数组 (不允许匿名查看)
router.get("/", optionalAuth, async (req: Request, res, next) => {
  if (req.adminId) return next('route');
  if (!req.userId) return res.json([]);
  try {
    const { status, paymentStatus, limit = 50 } = req.query;
    const where: any = { userId: req.userId, deletedByUser: false };
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        address: { select: { id: true, name: true, phone: true, province: true, city: true, district: true, detail: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(limit), 200),
    });
    res.json(orders);
  } catch (error) {
    console.error("Get client orders error:", error);
    res.status(500).json({ error: "获取订单列表失败" });
  }
});

// 用户删除订单（软删除，仅标记 deletedByUser）
router.patch("/:id/delete", optionalAuth, async (req: Request, res, next) => {
  if (req.adminId) return next('route');
  if (!req.userId) return res.status(401).json({ error: "请先登录" });

  try {
    const { id } = req.params;
    const order = await prisma.order.findFirst({
      where: { id, userId: req.userId },
    });

    if (!order) {
      return res.status(404).json({ error: "订单不存在" });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { deletedByUser: true },
    });

    res.json(updated);
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({ error: "删除订单失败" });
  }
});

// ====== 管理端接口 (需认证) ======

// 获取统计数据
router.get("/stats", adminOnlyMiddleware, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalOrders, todayOrders, todayRevenue, pendingOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.aggregate({ where: { createdAt: { gte: today }, paymentStatus: "paid" }, _sum: { total: true } }),
      prisma.order.count({ where: { paymentStatus: "unpaid" } }),
    ]);
    res.json({ totalOrders, todayOrders, todayRevenue: todayRevenue._sum.total || 0, pendingOrders });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "获取统计数据失败" });
  }
});

// 获取管理端订单列表（含用户和地址信息）
router.get("/", adminOnlyMiddleware, async (req, res) => {
  try {
    const { status, paymentStatus, date, limit = 100 } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      where.createdAt = { gte: startDate, lt: endDate };
    }
    const orders = await prisma.order.findMany({
      where, include: { items: true, address: { select: { id: true, name: true, phone: true, province: true, city: true, district: true, detail: true } }, user: { select: { id: true, nickname: true, phone: true, avatar: true } } },
      orderBy: { createdAt: "desc" }, take: Math.min(Number(limit), 500),
    });
    res.json(orders);
  } catch (error) {
    console.error("Get admin orders error:", error);
    res.status(500).json({ error: "获取订单列表失败" });
  }
});

// 公开订单列表 (无需认证)
router.get("/public", async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const orders = await prisma.order.findMany({ where: status ? { status: status as string } : undefined, include: { items: true }, orderBy: { createdAt: "desc" }, take: Number(limit) });
    res.json(orders);
  } catch (error) {
    console.error("Get public orders error:", error);
    res.status(500).json({ error: "获取订单列表失败" });
  }
});

// 生成交易流水号
function generateReferenceNo() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TX${y}${m}${d}${rand}`;
}

// 计算当前账户余额
async function getCurrentBalance(prisma) {
  const lastTx = await prisma.transaction.findFirst({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' },
  });
  return lastTx?.balanceAfter || 0;
}

// 创建交易记录
async function createTransaction(prisma, data) {
  const currentBalance = await getCurrentBalance(prisma);
  const newBalance = data.type === 'income' 
    ? currentBalance + data.amount 
    : currentBalance - data.amount;
  
  return prisma.transaction.create({
    data: {
      type: data.type,
      category: data.category,
      amount: data.amount,
      balanceAfter: newBalance,
      orderId: data.orderId,
      description: data.description,
      remark: data.remark,
      operator: data.operator,
      referenceNo: generateReferenceNo(),
      paymentMethod: data.paymentMethod,
      status: 'completed',
    },
  });
}

// 标记订单已支付（管理端）
router.patch("/:id/pay", adminOnlyMiddleware, async (req, res) => {
  try {
    const { paymentMethod = 'cash' } = req.body;
    
    // 先获取订单信息
    const existingOrder = await prisma.order.findUnique({ 
      where: { id: req.params.id },
      include: { items: true }
    });
    
    if (!existingOrder) {
      return res.status(404).json({ error: "订单不存在" });
    }
    
    // 检查是否已支付，避免重复创建交易记录
    if (existingOrder.paymentStatus === 'paid') {
      return res.status(400).json({ error: "订单已支付" });
    }
    
    // 更新订单状态
    const order = await prisma.order.update({ 
      where: { id: req.params.id }, 
      data: { paymentStatus: "paid", status: "paid" }, 
      include: { items: true } 
    });
    
    // 自动创建交易记录（收入）
    await createTransaction(prisma, {
      type: 'income',
      category: '销售收入',
      amount: order.total,
      orderId: order.id,
      description: `订单支付 - ${order.orderNo}`,
      operator: req.adminUsername || 'admin',
      paymentMethod: paymentMethod,
    });
    
    io.to("admin").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status });
    io.to("client").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status });
    io.emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status });
    res.json(order);
  } catch (error) {
    console.error("Mark paid error:", error);
    res.status(500).json({ error: "标记支付失败" });
  }
});

// 更新订单状态
router.patch("/:id/status", adminOnlyMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "paid", "making", "completed", "cancelled"];
    if (!validStatuses.includes(status)) { return res.status(400).json({ error: "无效的订单状态" }); }
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { status }, include: { items: true } });
    io.to("admin").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status, total: order.total, items: order.items, createdAt: order.createdAt });
    io.to("client").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status });
    io.emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status });
    res.json(order);
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ error: "更新订单状态失败" });
  }
});

// 确认收款
router.post("/:id/confirm", adminOnlyMiddleware, async (req, res) => {
  try {
    const { success, paymentMethod = 'cash' } = req.body;
    
    // 先获取订单信息
    const existingOrder = await prisma.order.findUnique({ 
      where: { id: req.params.id },
      include: { items: true }
    });
    
    if (!existingOrder) {
      return res.status(404).json({ error: "订单不存在" });
    }
    
    // 更新订单状态
    const order = await prisma.order.update({ 
      where: { id: req.params.id }, 
      data: { paymentStatus: success ? "paid" : "failed", status: success ? "paid" : "cancelled" }, 
      include: { items: true } 
    });
    
    // 支付成功时自动创建交易记录（收入）
    if (success && existingOrder.paymentStatus !== 'paid') {
      await createTransaction(prisma, {
        type: 'income',
        category: '销售收入',
        amount: order.total,
        orderId: order.id,
        description: `订单支付 - ${order.orderNo}`,
        operator: req.adminUsername || 'admin',
        paymentMethod: paymentMethod,
      });
    }
    
    // 支付失败时创建退款支出记录
    if (!success && existingOrder.paymentStatus !== 'paid') {
      await createTransaction(prisma, {
        type: 'expense',
        category: '退款支出',
        amount: order.total,
        orderId: order.id,
        description: `支付失败退款 - ${order.orderNo}`,
        remark: '客户支付失败退款',
        operator: req.adminUsername || 'admin',
        paymentMethod: paymentMethod,
      });
    }
    
    io.emit("payment:confirm", { orderId: order.id, orderNo: order.orderNo, status: success ? "success" : "failed" });
    io.to("admin").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status, paymentStatus: order.paymentStatus, total: order.total, items: order.items, createdAt: order.createdAt });
    io.to("client").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status, paymentStatus: order.paymentStatus });
    io.emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status, paymentStatus: order.paymentStatus });
    res.json(order);
  } catch (error) {
    console.error("Confirm payment error:", error);
    res.status(500).json({ error: "确认收款失败" });
  }
});

// 删除订单
router.delete("/:id", adminOnlyMiddleware, async (req, res) => {
  try {
    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({ error: "删除订单失败" });
  }
});

// ====== 公开接口 (鉴权) ======

// 获取订单详情 (需鉴权 - 只能查看自己的订单，管理员可查看所有)
router.get("/:id", optionalAuth, async (req: Request, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        address: { select: { id: true, name: true, phone: true, province: true, city: true, district: true, detail: true } },
      },
    });
    if (!order) { return res.status(404).json({ error: "订单不存在" }); }
    // 鉴权检查：必须登录，且订单属于当前用户（或当前用户是管理员）
    if (!req.userId && !req.adminId) {
      return res.status(401).json({ error: "未授权，请先登录" });
    }
    if (req.userId && order.userId !== req.userId) {
      return res.status(403).json({ error: "无权查看此订单" });
    }
    // 用户端已删除的订单对用户返回404
    if (req.userId && order.deletedByUser) {
      return res.status(404).json({ error: "订单不存在" });
    }
    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ error: "获取订单失败" });
  }
});

// 客户端取消订单 (需鉴权 - 只能取消自己的订单)
router.post("/:id/cancel", optionalAuth, async (req: Request, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) { return res.status(404).json({ error: "订单不存在" }); }
    // 鉴权检查
    if (!req.userId && !req.adminId) {
      return res.status(401).json({ error: "未授权，请先登录" });
    }
    if (req.userId && order.userId !== req.userId) {
      return res.status(403).json({ error: "无权操作此订单" });
    }
    if (order.paymentStatus !== "unpaid" || order.status !== "pending") {
      return res.status(400).json({ error: "该订单已支付或已处理，无法取消" });
    }
    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: "cancelled", paymentStatus: "cancelled" },
      include: { items: true },
    });
    // 广播给管理端和客户端
    io.to("admin").emit("order:cancelled", { orderId: updatedOrder.id, orderNo: updatedOrder.orderNo, status: "cancelled" });
    io.to("client").emit("order:cancelled", { orderId: updatedOrder.id, orderNo: updatedOrder.orderNo, status: "cancelled" });
    // 如果订单属于某个用户，向该用户的 socket 房间单独推送
    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit("order:status-update", {
        orderId: updatedOrder.id,
        orderNo: updatedOrder.orderNo,
        status: updatedOrder.status,
      });
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ error: "取消订单失败" });
  }
});

export default router;
