// Email Consumer
// Processes order and print-order events from RabbitMQ, sends emails with invoice attachment

const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('@sarkari/logger');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const INVOICE_DIR = '/root/storage/invoices';

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Email templates ──────────────────────────────────

const orderCreatedEmail = (data) => ({
  subject: `✅ Order Confirmation — NVS BookStore`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #1e40af;">Order Confirmed!</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Thank you for your order. Here's a summary:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 8px; text-align: left;">Item</th>
            <th style="padding: 8px; text-align: right;">Qty</th>
            <th style="padding: 8px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${(data.items || []).map(item => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px;">${item.title}</td>
              <td style="padding: 8px; text-align: right;">${item.quantity}</td>
              <td style="padding: 8px; text-align: right;">₹${item.price}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="font-size: 18px; font-weight: bold;">Total: ₹${data.total}</p>
      <p style="color: #64748b; font-size: 14px;">Order ID: ${data.orderId}</p>
      <p style="color: #64748b; font-size: 14px;">Your invoice is attached to this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px;">NVS BookStore — Your One-Stop Destination for Competitive Exam Books</p>
    </div>
  `,
});

const orderStatusEmail = (data) => ({
  subject: `📢 Order Status: ${data.status.toUpperCase()} — NVS BookStore`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #1e40af;">Order Status Update</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Your order <strong>${data.orderId}</strong> has been updated to: 
         <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-weight: bold;">
           ${data.status.toUpperCase()}
         </span>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px;">NVS BookStore</p>
    </div>
  `,
});

const printOrderEmail = (data) => ({
  subject: `🖨️ Print Order Confirmation — NVS BookStore`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #7c3aed;">Print Order Confirmed!</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Your print order has been placed. Total: <strong>₹${data.totalPrice}</strong></p>
      <p style="color: #64748b; font-size: 14px;">Order ID: ${data.orderId}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px;">NVS BookStore</p>
    </div>
  `,
});

// ── Helpers ──────────────────────────────────

/**
 * Wait for invoice file to appear on disk (invoice consumer runs in parallel)
 */
const waitForInvoice = (orderId, maxWaitMs = 10000) => {
  return new Promise((resolve) => {
    const filePath = path.join(INVOICE_DIR, `invoice_${orderId}.pdf`);
    const start = Date.now();
    const check = () => {
      if (fs.existsSync(filePath)) {
        resolve(filePath);
      } else if (Date.now() - start > maxWaitMs) {
        resolve(null); // timed out, send email without attachment
      } else {
        setTimeout(check, 1000);
      }
    };
    check();
  });
};

// ── Consumer logic ──────────────────────────────────

const startConsuming = async () => {
  try {
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();

    const exchange = 'sarkari_events';
    const queue = 'email_queue';

    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });

    // Bind to all order and print events
    await channel.bindQueue(queue, exchange, 'order.*');
    await channel.bindQueue(queue, exchange, 'print_order.*');

    channel.consume(queue, async (msg) => {
      try {
        const event = JSON.parse(msg.content.toString());
        logger.info(`Processing email event: ${event.type}`);

        let emailConfig;
        let attachments = [];

        switch (event.type) {
          case 'order.created':
            emailConfig = orderCreatedEmail(event.data);
            // Wait for invoice to be generated and attach it
            const invoicePath = await waitForInvoice(event.data.orderId);
            if (invoicePath) {
              attachments.push({
                filename: `invoice_${event.data.orderId}.pdf`,
                path: invoicePath,
                contentType: 'application/pdf',
              });
              logger.info(`Invoice attached: ${invoicePath}`);
            } else {
              logger.warn(`Invoice not available yet for order ${event.data.orderId}, sending email without attachment`);
            }
            break;
          case 'order.status_updated':
            emailConfig = orderStatusEmail(event.data);
            break;
          case 'print_order.created':
            emailConfig = printOrderEmail(event.data);
            break;
          case 'print_order.status_updated':
            emailConfig = orderStatusEmail({ ...event.data, customerName: 'Customer' });
            break;
          default:
            logger.warn(`Unknown event type: ${event.type}`);
            channel.ack(msg);
            return;
        }

        const to = event.data.customerEmail || event.data.email;
        if (to) {
          await transporter.sendMail({
            from: `"NVS BookStore" <${process.env.SMTP_USER}>`,
            to,
            subject: emailConfig.subject,
            html: emailConfig.html,
            attachments,
          });
          logger.info(`Email sent to ${to} for event: ${event.type}`);
        }

        // Also notify admin for new orders
        if (event.type === 'order.created' || event.type === 'print_order.created') {
          const adminEmail = process.env.ADMIN_MAIL;
          if (adminEmail) {
            await transporter.sendMail({
              from: `"NVS BookStore" <${process.env.SMTP_USER}>`,
              to: adminEmail,
              subject: `📦 New ${event.type === 'print_order.created' ? 'Print ' : ''}Order from ${event.data.customerName}`,
              html: emailConfig.html,
              attachments,
            });
            logger.info(`Admin notified: ${adminEmail}`);
          }
        }

        channel.ack(msg);
      } catch (error) {
        logger.error('Error processing email:', error);
        channel.nack(msg, false, true); // Requeue
      }
    });

    logger.info('Email consumer started — listening for order.* and print_order.*');
  } catch (error) {
    logger.error('Email consumer error:', error);
  }
};

module.exports = { startConsuming };
