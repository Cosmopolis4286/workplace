import { Prisma } from '@prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import {
  isPositive,
  toDecimal,
  type MoneyInput,
} from '../../../common/money/money';

// Reintentos ante choque de número de comprobante (ver create()).
const RECEIPT_NUMBER_MAX_ATTEMPTS = 5;

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService
  ) {}

  async create(commerceId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, commerceId },
      include: { receipt: true },
    });
    if (!order)
      throw new NotFoundException(this.i18n.t('receipts.order_not_found'));
    if (order.receipt)
      throw new ConflictException(this.i18n.t('receipts.already_issued'));

    const commerce = await this.prisma.commerce.findUnique({
      where: { id: commerceId },
    });

    // Correlativo por comercio (único por commerceId+receiptNumber). Ante
    // choque (emisión simultánea o comprobante borrado) se prueba el
    // siguiente número; si el choque es por orderId, ya fue emitido.
    const count = await this.prisma.receipt.count({ where: { commerceId } });
    const year = new Date().getFullYear();
    for (let attempt = 1; ; attempt++) {
      const receiptNumber = `COMP-${year}-${String(count + attempt).padStart(5, '0')}`;
      try {
        return await this.prisma.receipt.create({
          data: {
            receiptNumber,
            orderId,
            commerceId,
            commerceName: commerce?.name ?? 'Comercio',
            commerceAddress: commerce?.address,
            commercePhone: commerce?.phone,
          },
        });
      } catch (e) {
        if (
          !(e instanceof Prisma.PrismaClientKnownRequestError) ||
          e.code !== 'P2002'
        )
          throw e;
        const target = String(e.meta?.target ?? '');
        if (target.includes('orderId'))
          throw new ConflictException(this.i18n.t('receipts.already_issued'));
        if (attempt >= RECEIPT_NUMBER_MAX_ATTEMPTS) throw e;
      }
    }
  }

  async findOne(id: string, commerceId: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id, commerceId },
      include: { order: { include: { items: true } } },
    });
    if (!receipt)
      throw new NotFoundException(this.i18n.t('receipts.not_found'));
    return receipt;
  }

  async findByOrder(orderId: string, commerceId: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { orderId, commerceId },
      include: { order: { include: { items: true } } },
    });
    if (!receipt)
      throw new NotFoundException(this.i18n.t('receipts.not_found'));
    return receipt;
  }

  async generatePdf(id: string, commerceId: string): Promise<Buffer> {
    const receipt = await this.findOne(id, commerceId);
    const settings = await this.prisma.commerceSettings.findUnique({
      where: { commerceId },
    });
    const currency = settings?.currency ?? 'USD';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderPdf(doc, receipt, currency);
      doc.end();
    });
  }

  private renderPdf(doc: PDFKit.PDFDocument, receipt: any, currency: string) {
    const order = receipt.order;
    const money = (n: MoneyInput) => `${currency} ${toDecimal(n).toFixed(2)}`;

    const marginLeft = doc.page.margins.left;
    const contentWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rightEdge = marginLeft + contentWidth;

    doc
      .fontSize(9)
      .fillColor('#b91c1c')
      .text('COMPROBANTE DE VENTA — NO ES FACTURA FISCAL', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(16)
      .fillColor('#111827')
      .text(receipt.commerceName, { align: 'center' });

    if (receipt.commerceAddress) {
      doc
        .fontSize(9)
        .fillColor('#4b5563')
        .text(receipt.commerceAddress, { align: 'center' });
    }
    if (receipt.commercePhone) {
      doc
        .fontSize(9)
        .fillColor('#4b5563')
        .text(receipt.commercePhone, { align: 'center' });
    }

    doc.moveDown(1);
    doc
      .fontSize(11)
      .fillColor('#111827')
      .text(`Comprobante N°: ${receipt.receiptNumber}`)
      .text(`Fecha: ${new Date(receipt.issuedAt).toLocaleString('es-VE')}`)
      .text(`Pedido: ${order.orderNumber}`);

    doc.moveDown(0.5);
    doc.text(`Cliente: ${order.customerName}`);
    if (order.customerPhone) doc.text(`Teléfono: ${order.customerPhone}`);

    doc.moveDown(1);

    // Columnas dimensionadas contra el ancho real de la página (A5 ~ 420pt,
    // área útil ~340pt con márgenes de 40) — nunca números fijos que asumen
    // A4, o el texto se corta contra el borde derecho.
    const col = {
      desc: { x: marginLeft, width: contentWidth * 0.45 },
      qty: { x: marginLeft + contentWidth * 0.45, width: contentWidth * 0.12 },
      unit: { x: marginLeft + contentWidth * 0.57, width: contentWidth * 0.2 },
      subtotal: {
        x: marginLeft + contentWidth * 0.77,
        width: contentWidth * 0.23,
      },
    };

    doc.fontSize(10).fillColor('#111827');
    const headerY = doc.y;
    doc.text('Descripción', col.desc.x, headerY, { width: col.desc.width });
    doc.text('Cant.', col.qty.x, headerY, {
      width: col.qty.width,
      align: 'right',
    });
    doc.text('P.Unit', col.unit.x, headerY, {
      width: col.unit.width,
      align: 'right',
    });
    doc.text('Subtotal', col.subtotal.x, headerY, {
      width: col.subtotal.width,
      align: 'right',
    });

    doc.moveDown(0.5);
    doc
      .moveTo(marginLeft, doc.y)
      .lineTo(rightEdge, doc.y)
      .strokeColor('#e5e7eb')
      .stroke();
    doc.moveDown(0.3);

    for (const item of order.items) {
      const rowY = doc.y;
      doc.fontSize(9).fillColor('#374151');
      doc.text(item.productName, col.desc.x, rowY, { width: col.desc.width });
      doc.text(String(item.quantity), col.qty.x, rowY, {
        width: col.qty.width,
        align: 'right',
      });
      doc.text(money(item.unitPrice), col.unit.x, rowY, {
        width: col.unit.width,
        align: 'right',
      });
      doc.text(money(item.subtotal), col.subtotal.x, rowY, {
        width: col.subtotal.width,
        align: 'right',
      });
      doc.moveDown(0.5);
    }

    doc.moveDown(0.3);
    doc
      .moveTo(marginLeft, doc.y)
      .lineTo(rightEdge, doc.y)
      .strokeColor('#e5e7eb')
      .stroke();
    doc.moveDown(0.5);

    const totalsWidth = contentWidth * 0.5;
    const totalsX = rightEdge - totalsWidth;
    doc.fontSize(9).fillColor('#4b5563');
    doc.text(`Subtotal: ${money(order.subtotal)}`, totalsX, doc.y, {
      width: totalsWidth,
      align: 'right',
    });
    if (isPositive(order.discount))
      doc.text(`Descuento: -${money(order.discount)}`, totalsX, doc.y, {
        width: totalsWidth,
        align: 'right',
      });
    if (isPositive(order.tax))
      doc.text(`Impuestos: ${money(order.tax)}`, totalsX, doc.y, {
        width: totalsWidth,
        align: 'right',
      });
    if (isPositive(order.deliveryFee))
      doc.text(`Delivery: ${money(order.deliveryFee)}`, totalsX, doc.y, {
        width: totalsWidth,
        align: 'right',
      });

    doc.moveDown(0.3);
    doc
      .fontSize(13)
      .fillColor('#111827')
      .text(`Total: ${money(order.total)}`, totalsX, doc.y, {
        width: totalsWidth,
        align: 'right',
      });

    doc.moveDown(1.5);
    doc
      .fontSize(8)
      .fillColor('#9ca3af')
      .text(
        'Este documento es un comprobante interno de venta y no constituye una factura fiscal homologada por el SENIAT.',
        marginLeft,
        doc.y,
        { width: contentWidth, align: 'center' }
      );
  }
}
