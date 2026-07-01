import type { Order } from '../../../shared/types';
import { formatFullDate, formatPrice } from './utils';

const BRAND_NAME = '云栖浅食';
const PAPER_WIDTH = 58; // 58mm thermal printer width in characters

function centerText(text: string, width: number = PAPER_WIDTH): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function repeatChar(char: string, count: number): string {
  return char.repeat(count);
}

export function generateReceiptText(order: Order): string {
  const lines: string[] = [];
  const divider = repeatChar('-', PAPER_WIDTH);

  // Header
  lines.push(centerText(BRAND_NAME, PAPER_WIDTH));
  lines.push(centerText('='.repeat(PAPER_WIDTH), PAPER_WIDTH));
  lines.push('');

  // Order info
  lines.push(`订单号: ${order.orderNo}`);
  lines.push(`下单时间: ${formatFullDate(order.createdAt)}`);
  lines.push(divider);

  // Items
  lines.push('商品明细:');
  for (const item of order.items) {
    const itemLine = `${item.productName}`;
    const qtyLine = `  x${item.quantity}  ${formatPrice(item.price * item.quantity)}`;
    lines.push(itemLine);
    lines.push(qtyLine);
  }

  lines.push(divider);

  // Total
  lines.push(`合计: ${formatPrice(order.total)}`);
  lines.push('');

  // Remark
  if (order.remark) {
    lines.push(`备注: ${order.remark}`);
    lines.push('');
  }

  // Footer
  lines.push(centerText('感谢您的光临', PAPER_WIDTH));
  lines.push(centerText('欢迎下次光临', PAPER_WIDTH));

  return lines.join('\n');
}

export function printReceipt(order: Order): { success: boolean; error?: string } {
  const receiptText = generateReceiptText(order);

  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (!printWindow) {
    return { success: false, error: '无法打开打印窗口，请检查浏览器设置' };
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>小票打印</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            padding: 10px;
            width: 58mm;
            white-space: pre-wrap;
            word-break: break-all;
          }
          @media print {
            body {
              width: 58mm;
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>${receiptText}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);

  return { success: true };
}
