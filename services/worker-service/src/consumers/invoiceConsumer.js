// Invoice Consumer
// Generates PDF invoices for orders and uploads to MinIO

const amqp = require('amqplib');
const PDFDocument = require('pdfkit');
const logger = require('@sarkari/logger');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

/**
 * Generate a professional invoice PDF as a Buffer
 */
const generateInvoice = (data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

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

    // Table header
    const tableTop = 230;
    doc
      .font('Helvetica-Bold')
      .text('Item', 50, tableTop)
      .text('Qty', 350, tableTop, { width: 50, align: 'right' })
      .text('Price', 420, tableTop, { width: 80, align: 'right' });

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(500, tableTop + 15)
      .stroke();

    // Table rows
    let y = tableTop + 25;
    const items = data.items || [];

    items.forEach((item) => {
      doc
        .font('Helvetica')
        .text(item.title || 'Product', 50, y, { width: 280 })
        .text(String(item.quantity || item.copies || 1), 350, y, { width: 50, align: 'right' })
        .text(`₹${item.price || item.pricePerCopy || 0}`, 420, y, { width: 80, align: 'right' });
      y += 20;
    });

    // Total
    doc
      .moveTo(50, y + 5)
      .lineTo(500, y + 5)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(`Total: ₹${data.total || data.totalPrice || 0}`, 350, y + 15, {
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

        // Write to /tmp for now (can be uploaded to MinIO later)
        const fs = require('fs');
        const path = require('path');
        const dir = '/tmp/invoices';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, filename), pdfBuffer);

        logger.info(`Invoice generated: ${filename} (${pdfBuffer.length} bytes)`);
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
