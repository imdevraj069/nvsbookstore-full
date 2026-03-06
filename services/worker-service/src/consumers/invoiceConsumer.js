// Invoice Consumer
// Generates PDF invoices for orders, stores to ~/storage/invoices, updates Order document

const amqp = require('amqplib');
const PDFDocument = require('pdfkit');
const logger = require('@sarkari/logger');
const { Order } = require('@sarkari/database').models;
const os = require('os');
const path = require('path');
const fs = require('fs');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const INVOICE_DIR = path.join(os.homedir(), 'storage', 'invoices');

/**
 * Generate a professional invoice PDF with separate sections for physical/POD and digital items
 */
const generateInvoice = (data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const items = data.items || [];
    const physicalItems = items.filter((i) => i.format === 'physical' || i.subFormat === 'print-on-demand');
    const digitalItems = items.filter((i) => i.format === 'digital' && i.subFormat !== 'print-on-demand');

    // Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('NVS BookStore', 50, 50)
      .fontSize(10)
      .font('Helvetica')
      .text('Your One-Stop Destination for Competitive Exam Books', 50, 80)
      .moveDown(2);

    // Invoice details
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('INVOICE', 50, 120)
      .fontSize(10)
      .font('Helvetica')
      .text(`Order ID: ${data.orderId}`, 50, 150)
      .text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 50, 165)
      .text(`Customer: ${data.customerName}`, 50, 180)
      .text(`Email: ${data.customerEmail || ''}`, 50, 195)
      .moveDown(2);

    let y = 230;

    // ─── Section 1: Physical / Print-on-Demand Items ───
    if (physicalItems.length > 0) {
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#1e40af')
        .text('📦  Physical / Print-on-Demand Items', 50, y);
      y += 20;

      doc
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Item', 50, y)
        .text('Format', 280, y)
        .text('Qty', 360, y, { width: 40, align: 'right' })
        .text('Price', 420, y, { width: 80, align: 'right' });
      y += 15;

      doc.moveTo(50, y).lineTo(500, y).stroke();
      y += 10;

      doc.font('Helvetica').fontSize(10);
      physicalItems.forEach((item) => {
        const label = item.subFormat === 'print-on-demand' ? 'Print-on-Demand' : 'Physical';
        doc
          .text(item.title || 'Product', 50, y, { width: 220 })
          .text(label, 280, y)
          .text(String(item.quantity || 1), 360, y, { width: 40, align: 'right' })
          .text(`₹${item.price || 0}`, 420, y, { width: 80, align: 'right' });
        y += 20;
      });

      y += 10;
    }

    // ─── Section 2: Digital Items ───
    if (digitalItems.length > 0) {
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#059669')
        .text('📄  Digital Products (Delivered Instantly)', 50, y);
      y += 20;

      doc
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Item', 50, y)
        .text('Status', 280, y)
        .text('Qty', 360, y, { width: 40, align: 'right' })
        .text('Price', 420, y, { width: 80, align: 'right' });
      y += 15;

      doc.moveTo(50, y).lineTo(500, y).stroke();
      y += 10;

      doc.font('Helvetica').fontSize(10);
      digitalItems.forEach((item) => {
        doc
          .text(item.title || 'Product', 50, y, { width: 220 })
          .fillColor('#059669')
          .text('✓ Delivered', 280, y)
          .fillColor('#000000')
          .text(String(item.quantity || 1), 360, y, { width: 40, align: 'right' })
          .text(`₹${item.price || 0}`, 420, y, { width: 80, align: 'right' });
        y += 20;
      });

      y += 10;
    }

    // If only one type, still render normally if both sections are empty
    if (physicalItems.length === 0 && digitalItems.length === 0) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Item', 50, y)
        .text('Qty', 360, y, { width: 40, align: 'right' })
        .text('Price', 420, y, { width: 80, align: 'right' });
      y += 15;
      doc.moveTo(50, y).lineTo(500, y).stroke();
      y += 10;

      doc.font('Helvetica');
      items.forEach((item) => {
        doc
          .text(item.title || 'Product', 50, y, { width: 280 })
          .text(String(item.quantity || item.copies || 1), 360, y, { width: 40, align: 'right' })
          .text(`₹${item.price || item.pricePerCopy || 0}`, 420, y, { width: 80, align: 'right' });
        y += 20;
      });
      y += 10;
    }

    // Total
    doc.moveTo(50, y).lineTo(500, y).stroke();
    y += 10;

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(`Total: ₹${data.total || data.totalPrice || 0}`, 350, y, {
        width: 150,
        align: 'right',
      });

    // Footer
    doc
      .fontSize(8)
      .font('Helvetica')
      .text('Thank you for shopping with NVS BookStore!', 50, 700, { align: 'center' })
      .text('This is a computer-generated invoice.', 50, 715, { align: 'center' });

    doc.end();
  });
};

const startConsuming = async () => {
  try {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();

    const exchange = 'sarkari_events';
    const queue = 'invoice_queue';

    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, 'order.created');
    await channel.bindQueue(queue, exchange, 'print_order.created');

    channel.consume(queue, async (msg) => {
      try {
        const event = JSON.parse(msg.content.toString());
        logger.info(`Processing invoice event: ${event.type}`);

        const pdfBuffer = await generateInvoice(event.data);
        const filename = `invoice_${event.data.orderId}.pdf`;

        // Write to persistent storage
        if (!fs.existsSync(INVOICE_DIR)) fs.mkdirSync(INVOICE_DIR, { recursive: true });
        const filePath = path.join(INVOICE_DIR, filename);
        fs.writeFileSync(filePath, pdfBuffer);

        // Update order with invoice path
        try {
          await Order.findByIdAndUpdate(event.data.orderId, { invoicePath: filename });
          logger.info(`Order ${event.data.orderId} updated with invoicePath: ${filename}`);
        } catch (updateErr) {
          logger.warn('Failed to update order with invoicePath:', updateErr);
        }

        logger.info(`Invoice generated: ${filename} (${pdfBuffer.length} bytes) at ${filePath}`);
        channel.ack(msg);
      } catch (error) {
        logger.error('Error generating invoice:', error);
        channel.nack(msg, false, true);
      }
    });

    logger.info('Invoice consumer started — listening for order.created, print_order.created');
  } catch (error) {
    logger.error('Invoice consumer error:', error);
  }
};

module.exports = { startConsuming };
