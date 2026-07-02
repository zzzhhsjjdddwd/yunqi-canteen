// @ts-nocheck
import { Router, Request, Response, NextFunction } from "express";
import { prisma, io } from "../app.js";
import { authMiddleware, adminAuthMiddleware } from "../middleware/auth.js";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { createTransactionInTx, generateInvoiceNo } from "../utils/financeService.js";

const router = Router();

function enrichOrderItems(order: any) {
  if (order && order.items && Array.isArray(order.items)) {
    order.items = order.items.map((item: any) => ({
      ...item,
      subtotal: item.price * item.quantity,
    }));
  }
  return order;
}

function enrichOrderList(orders: any[]) {
  return orders.map(enrichOrderItems);
}

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
SECRET
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
router.post("/", optionalAuth, async (req: Request, res) => {
  try {
    const { items, remark, addressId } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "订单商品不能为空" });
    }

    const userId = req.userId;
    if (addressId) {
      if (!userId) {
        return res.status(401).json({ error: "请先登录" });
      }
      const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
      if (!address) { return res.status(400).json({ error: "地址不存在" }); }
    }

    // 服务端按商品现价重算金额，不信任客户端传的 total
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: 'active' },
    });

    if (products.length === 0) {
      return res.status(400).json({ error: "商品不存在或已下架" });
    }

    const productMap = new Map(products.map(p => [p.id, p]));
    let calculatedTotal = 0;
    const orderItems = items.map((item: any) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`商品 ${item.productId} 不存在`);
      }
      const quantity = Math.max(1, Math.min(99, parseInt(item.quantity) || 1));
      const price = Math.round(product.price);
      const subtotal = price * quantity;
      calculatedTotal += subtotal;
      return {
        productId: product.id,
        productName: product.name,
        price,
        quantity,
        subtotal,
      };
    });

    const orderNo = generateOrderNo();
    const order = await prisma.order.create({
      data: {
        orderNo,
        total: calculatedTotal,
        status: "pending",
        paymentStatus: "unpaid",
        remark,
        userId,
        addressId,
        items: { create: orderItems },
      },
      include: { items: true, address: { select: { id: true, name: true, phone: true, province: true, city: true, district: true, detail: true } }, user: { select: { id: true, nickname: true, phone: true, avatar: true } } },
    });
    const enriched = enrichOrderItems(order);
    io.to("admin").emit("order:create", { orderId: enriched.id, orderNo: enriched.orderNo, items: enriched.items, total: enriched.total, remark: enriched.remark, createdAt: enriched.createdAt, address: enriched.address, user: enriched.user });
    res.status(201).json(enriched);
  } catch (error: any) {
    console.error("Create order error:", error);
    res.status(500).json({ error: error.message || "创建订单失败" });
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
    res.json(enrichOrderList(orders));
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

    res.json(enrichOrderItems(updated));
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({ error: "删除订单失败" });
  }
});

// ====== 管理端接口 (需认证) ======

// 获取统计数据
router.get("/stats", adminAuthMiddleware, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalOrders, todayOrders, todayRevenue, pendingOrders, totalProducts, totalUsers, preparingOrders, completedOrders, cancelledOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.aggregate({ where: { createdAt: { gte: today }, paymentStatus: "paid" }, _sum: { total: true } }),
      prisma.order.count({ where: { paymentStatus: "unpaid" } }),
      prisma.product.count({ where: { status: 'active' } }),
      prisma.user.count(),
      prisma.order.count({ where: { status: 'making' } }),
      prisma.order.count({ where: { status: 'completed', createdAt: { gte: today } } }),
      prisma.order.count({ where: { status: 'cancelled', createdAt: { gte: today } } }),
    ]);
    res.json({
      totalOrders,
      todayOrders,
      todayRevenue: todayRevenue._sum.total || 0,
      pendingOrders,
      totalProducts,
      totalUsers,
      preparingOrders,
      completedOrders,
      cancelledOrders,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "获取统计数据失败" });
  }
});

// 获取管理端订单列表（含用户和地址信息，服务端分页）
router.get("/", adminAuthMiddleware, async (req, res) => {
  try {
    const { status, paymentStatus, date, search, filter, page = '1', pageSize = '20' } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    // 处理筛选预设
    if (filter === 'pending') {
      where.paymentStatus = 'unpaid';
      where.status = 'pending';
    } else if (filter === 'active') {
      where.status = { in: ['paid', 'making'] };
    } else if (filter === 'completed') {
      where.status = 'completed';
    } else {
      // 单独的 status/paymentStatus 过滤
      if (status) where.status = status;
      if (paymentStatus) where.paymentStatus = paymentStatus;
    }

    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      where.createdAt = { gte: startDate, lt: endDate };
    }

    // 搜索：按订单号或用户手机号
    if (search) {
      const searchTerm = String(search).trim();
      where.OR = [
        { orderNo: { contains: searchTerm } },
        { user: { phone: { contains: searchTerm } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, address: { select: { id: true, name: true, phone: true, province: true, city: true, district: true, detail: true } }, user: { select: { id: true, nickname: true, phone: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSizeNum,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders: enrichOrderList(orders), total, page: pageNum, pageSize: pageSizeNum });
  } catch (error) {
    console.error("Get admin orders error:", error);
    res.status(500).json({ error: "获取订单列表失败" });
  }
});

// 公开订单列表已移除（安全风险：暴露所有订单数据）

// 标记订单已支付（管理端）
router.patch("/:id/pay", adminAuthMiddleware, async (req, res) => {
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

    // 检查是否已支付，避免重复创建交易记录（幂等）
    if (existingOrder.paymentStatus === 'paid') {
      return res.status(400).json({ error: "订单已支付" });
    }

    // 使用数据库事务保证一致性
    const order = await prisma.$transaction(async (tx) => {
      // 更新订单状态
      const updated = await tx.order.update({
        where: { id: req.params.id },
        data: { paymentStatus: "paid", status: "paid" },
        include: { items: true }
      });

      // 创建销售账单
      const invoiceNo = generateInvoiceNo('sale');
      await tx.invoice.create({
        data: {
          invoiceNo,
          type: 'sale',
          amount: updated.total,
          orderId: updated.id,
          status: 'paid',
          items: updated.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
          })),
          operator: req.adminUsername || 'admin',
          issuedAt: new Date(),
          paidAt: new Date(),
        },
      });

      // 创建交易记录（收入）
      await createTransactionInTx(tx, {
        type: 'income',
        category: '销售收入',
        amount: updated.total,
        orderId: updated.id,
        description: `订单支付 - ${updated.orderNo}`,
        operator: req.adminUsername || 'admin',
        paymentMethod: paymentMethod,
      });

      return updated;
    });

    io.to("admin").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status });
    io.to("client").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status });
    res.json(enrichOrderItems(order));
  } catch (error) {
    console.error("Mark paid error:", error);
    res.status(500).json({ error: "标记支付失败" });
  }
});

// 更新订单状态
router.patch("/:id/status", adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "paid", "making", "completed", "cancelled"];
    if (!validStatuses.includes(status)) { return res.status(400).json({ error: "无效的订单状态" }); }
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { status }, include: { items: true } });
    io.to("admin").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status, total: order.total, items: order.items, createdAt: order.createdAt });
    io.to("client").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status });
    res.json(enrichOrderItems(order));
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ error: "更新订单状态失败" });
  }
});

// 确认收款
router.post("/:id/confirm", adminAuthMiddleware, async (req, res) => {
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

    // 幂等校验：已支付的订单不重复处理
    if (success && existingOrder.paymentStatus === 'paid') {
      return res.status(400).json({ error: "订单已支付" });
    }

    // 使用数据库事务保证一致性
    const order = await prisma.$transaction(async (tx) => {
      // 更新订单状态
      const updated = await tx.order.update({
        where: { id: req.params.id },
        data: { paymentStatus: success ? "paid" : "failed", status: success ? "paid" : "cancelled" },
        include: { items: true }
      });

      const invoiceItems = updated.items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }));

      // 支付成功时创建销售账单 + 收入交易
      if (success && existingOrder.paymentStatus !== 'paid') {
        const invoiceNo = generateInvoiceNo('sale');
        await tx.invoice.create({
          data: {
            invoiceNo,
            type: 'sale',
            amount: updated.total,
            orderId: updated.id,
            status: 'paid',
            items: invoiceItems,
            operator: req.adminUsername || 'admin',
            issuedAt: new Date(),
            paidAt: new Date(),
          },
        });

        await createTransactionInTx(tx, {
          type: 'income',
          category: '销售收入',
          amount: updated.total,
          orderId: updated.id,
          description: `订单支付 - ${updated.orderNo}`,
          operator: req.adminUsername || 'admin',
          paymentMethod: paymentMethod,
        });
      }

      // 支付失败时创建退款账单 + 支出交易
      if (!success && existingOrder.paymentStatus !== 'paid') {
        const invoiceNo = generateInvoiceNo('refund');
        await tx.invoice.create({
          data: {
            invoiceNo,
            type: 'refund',
            amount: updated.total,
            orderId: updated.id,
            status: 'refunded',
            items: invoiceItems,
            remark: '客户支付失败退款',
            operator: req.adminUsername || 'admin',
            issuedAt: new Date(),
            paidAt: new Date(),
          },
        });

        await createTransactionInTx(tx, {
          type: 'expense',
          category: '退款支出',
          amount: updated.total,
          orderId: updated.id,
          description: `支付失败退款 - ${updated.orderNo}`,
          remark: '客户支付失败退款',
          operator: req.adminUsername || 'admin',
          paymentMethod: paymentMethod,
        });
      }

      return updated;
    });

    // 定向推送 payment:confirm 给管理端和客户端房间，避免全局广播泄露信息
    io.to("admin").emit("payment:confirm", { orderId: order.id, orderNo: order.orderNo, status: success ? "success" : "failed" });
    io.to("client").emit("payment:confirm", { orderId: order.id, orderNo: order.orderNo, status: success ? "success" : "failed" });
    io.to("admin").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status, paymentStatus: order.paymentStatus, total: order.total, items: order.items, createdAt: order.createdAt });
    io.to("client").emit("order:status-update", { orderId: order.id, orderNo: order.orderNo, status: order.status, paymentStatus: order.paymentStatus });
    res.json(enrichOrderItems(order));
  } catch (error) {
    console.error("Confirm payment error:", error);
    res.status(500).json({ error: "确认收款失败" });
  }
});

// 删除订单
router.delete("/:id", adminAuthMiddleware, async (req, res) => {
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
    res.json(enrichOrderItems(order));
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
    res.json(enrichOrderItems(updatedOrder));
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ error: "取消订单失败" });
  }
});

export default router;
