// Email Consumer
// Processes email events from RabbitMQ

const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const logger = require('@sarkari/logger');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const startConsuming = async () => {
  try {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();

    const exchange = 'sarkari_events';
    const queue = 'email_queue';
    const routingKey = 'order.*';

    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, routingKey);

    channel.consume(queue, async (msg) => {
      try {
        const event = JSON.parse(msg.content.toString());
        logger.info(`Processing email event: ${event.type}`);

        const mailOptions = {
          from: process.env.SMTP_USER,
          to: event.data.email,
          subject: `Order Notification - ${event.type}`,
          text: `Order ID: ${event.data.orderId}`
        };

        await transporter.sendMail(mailOptions);
        logger.info(`Email sent for order: ${event.data.orderId}`);

        channel.ack(msg);
      } catch (error) {
        logger.error('Error processing email:', error);
        channel.nack(msg, false, true);
      }
    });

    logger.info('Email consumer started');
  } catch (error) {
    logger.error('Email consumer error:', error);
  }
};

module.exports = {
  startConsuming
};
