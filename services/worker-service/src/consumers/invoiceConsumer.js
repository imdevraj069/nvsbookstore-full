// Invoice Consumer
// Processes invoice generation events from RabbitMQ

const amqp = require('amqplib');
const PDFDocument = require('pdfkit');
const logger = require('@sarkari/logger');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

const generateInvoice = (orderData) => {
  const doc = new PDFDocument();
  
  doc.fontSize(25).text('Invoice', 100, 100);
  doc.fontSize(12).text(`Order ID: ${orderData.orderId}`, 100, 150);
  doc.text(`Total Amount: $${orderData.totalAmount}`, 100, 170);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 100, 190);

  return doc;
};

const startConsuming = async () => {
  try {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();

    const exchange = 'sarkari_events';
    const queue = 'invoice_queue';
    const routingKey = 'order.created';

    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, routingKey);

    channel.consume(queue, async (msg) => {
      try {
        const event = JSON.parse(msg.content.toString());
        logger.info(`Processing invoice event: ${event.type}`);

        const pdf = generateInvoice(event.data);
        const filename = `invoice_${event.data.orderId}.pdf`;

        pdf.pipe(require('fs').createWriteStream(`/tmp/${filename}`));
        pdf.end();

        logger.info(`Invoice generated: ${filename}`);
        channel.ack(msg);
      } catch (error) {
        logger.error('Error generating invoice:', error);
        channel.nack(msg, false, true);
      }
    });

    logger.info('Invoice consumer started');
  } catch (error) {
    logger.error('Invoice consumer error:', error);
  }
};

module.exports = {
  startConsuming
};
