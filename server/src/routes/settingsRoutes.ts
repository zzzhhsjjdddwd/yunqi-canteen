// @ts-nocheck
import { Router } from 'express';
import { prisma } from '../app.js';
import { upload } from '../utils/upload.js';
import { getFullUrl } from '../utils/url.js';
import { adminOnlyMiddleware } from '../middleware/adminOnly.js';

const router = Router();

// 获取收款二维码 (公开)
router.get('/payment-qr', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });
    const paymentQR = settings?.paymentQR || null;
    res.json({ paymentQR: getFullUrl(req, paymentQR) });
  } catch (error) {
    console.error('Get payment QR error:', error);
    res.status(500).json({ error: '获取收款二维码失败' });
  }
});

// ====== 管理端接口 (需认证) ======

// 上传收款二维码
router.post('/payment-qr', adminOnlyMiddleware, upload.single('qr'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }

    const qrUrl = `/uploads/${req.file.filename}`;
    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: { paymentQR: qrUrl },
      create: { id: 'default', paymentQR: qrUrl },
    });

    res.json({ paymentQR: getFullUrl(req, settings.paymentQR) });
  } catch (error) {
    console.error('Upload payment QR error:', error);
    res.status(500).json({ error: '上传收款二维码失败' });
  }
});

// 获取语音配置
router.get('/speaker', adminOnlyMiddleware, async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });
    res.json({
      notificationEnabled: settings?.notificationEnabled ?? true,
      speakerEnabled: settings?.speakerEnabled ?? true,
      speakerVolume: settings?.speakerVolume ?? 80,
      speakerNewOrderText: settings?.speakerNewOrderText ?? '新订单来了',
      speakerCancelledText: settings?.speakerCancelledText ?? '客户取消订单',
      speakerPaymentFailedText: settings?.speakerPaymentFailedText ?? '客户支付失败',
    });
  } catch (error) {
    console.error('Get speaker config error:', error);
    res.status(500).json({ error: '获取语音配置失败' });
  }
});

// 更新语音配置
router.put('/speaker', adminOnlyMiddleware, async (req, res) => {
  try {
    const {
      notificationEnabled,
      speakerEnabled,
      speakerVolume,
      speakerNewOrderText,
      speakerCancelledText,
      speakerPaymentFailedText,
    } = req.body;
    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        notificationEnabled,
        speakerEnabled,
        speakerVolume,
        speakerNewOrderText,
        speakerCancelledText,
        speakerPaymentFailedText,
      },
      create: {
        id: 'default',
        notificationEnabled: notificationEnabled ?? true,
        speakerEnabled: speakerEnabled ?? true,
        speakerVolume: speakerVolume ?? 80,
        speakerNewOrderText: speakerNewOrderText ?? '新订单来了',
        speakerCancelledText: speakerCancelledText ?? '客户取消订单',
        speakerPaymentFailedText: speakerPaymentFailedText ?? '客户支付失败',
      },
    });
    res.json(settings);
  } catch (error) {
    console.error('Update speaker config error:', error);
    res.status(500).json({ error: '更新语音配置失败' });
  }
});

// 获取单个配置项 (公开) - 必须放在最后，避免匹配到具体路径
router.get('/:key', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });
    if (!settings) {
      return res.json({});
    }
    res.json({
      [req.params.key]: (settings as any)[req.params.key],
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: '获取配置失败' });
  }
});

export default router;
