// Email Consumer
// Processes order and print-order events from RabbitMQ
// Sends format-specific emails with invoice attachment and status updates

const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('@sarkari/logger');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const INVOICE_DIR = '/root/storage/invoices';
const SITE_URL = 'https://nvsbookstore.in';

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

// ── Helpers ──────────────────────────────────

const itemsTable = (items) => `
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <thead>
      <tr style="background: #f1f5f9;">
        <th style="padding: 8px; text-align: left;">Item</th>
        <th style="padding: 8px; text-align: center;">Format</th>
        <th style="padding: 8px; text-align: right;">Qty</th>
        <th style="padding: 8px; text-align: right;">Price</th>
      </tr>
    </thead>
    <tbody>
      ${(items || []).map(item => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px;">${item.title}</td>
          <td style="padding: 8px; text-align: center; text-transform: capitalize;">${item.format || 'physical'}</td>
          <td style="padding: 8px; text-align: right;">${item.quantity}</td>
          <td style="padding: 8px; text-align: right;">₹${item.price}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`;

const footer = `
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
  <p style="color: #94a3b8; font-size: 12px;">NVS BookStore — Your One-Stop Destination for Competitive Exam Books</p>
`;

const statusBadge = (status) => {
  const colors = {
    pending: '#f59e0b', paid: '#10b981', processing: '#3b82f6',
    shipped: '#8b5cf6', delivered: '#10b981', cancelled: '#ef4444', refunded: '#6b7280',
  };
  const color = colors[status] || '#3b82f6';
  return `<span style="background: ${color}15; color: ${color}; padding: 4px 14px; border-radius: 20px; font-weight: bold; font-size: 14px;">${status.toUpperCase()}</span>`;
};

// ── Email templates ──────────────────────────────────

/**
 * Digital product purchase: invoice + link to dashboard digital library
 */
const digitalPurchaseEmail = (data) => ({
  subject: `✅ Digital Purchase Confirmed — NVS BookStore`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #1e40af;">Your Digital Products Are Ready!</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Thank you for your purchase! Your digital products are now available for download.</p>
      ${itemsTable(data.items)}
      <p style="font-size: 18px; font-weight: bold;">Total: ₹${data.total}</p>
      <p style="color: #64748b; font-size: 14px;">Order ID: ${data.orderId}</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${SITE_URL}/dashboard" style="display: inline-block; padding: 12px 32px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Access Your Digital Library →
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">You can access all your purchased digital products from your <a href="${SITE_URL}/dashboard" style="color: #1e40af;">Dashboard → Digital Library</a>.</p>
      <p style="color: #64748b; font-size: 14px;">Your invoice is attached to this email.</p>
      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: bold;">💬 How was your experience?</p>
        <a href="${SITE_URL}/feedback?orderId=${data.orderId}" style="display: inline-block; padding: 8px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">Share Your Feedback</a>
      </div>
      ${footer}
    </div>
  `,
});

/**
 * Physical / Print-on-demand purchase: invoice + order received message
 */
const physicalPurchaseEmail = (data) => ({
  subject: `✅ Order Confirmed — NVS BookStore`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #1e40af;">Order Received!</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Thank you for your order! We have received your order request and it is being processed.</p>
      ${itemsTable(data.items)}
      <p style="font-size: 18px; font-weight: bold;">Total: ₹${data.total}</p>
      <p style="color: #64748b; font-size: 14px;">Order ID: ${data.orderId}</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; color: #334155; font-size: 14px;">📦 <strong>What happens next?</strong></p>
        <p style="margin: 8px 0 0; color: #64748b; font-size: 13px;">We'll update you via email at each step — when your order is being processed, shipped, and delivered. You can also track your order anytime from your dashboard.</p>
      </div>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${SITE_URL}/dashboard" style="display: inline-block; padding: 12px 32px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Track Your Order →
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Your invoice is attached to this email.</p>
      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: bold;">💬 How was your experience?</p>
        <a href="${SITE_URL}/feedback?orderId=${data.orderId}" style="display: inline-block; padding: 8px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">Share Your Feedback</a>
      </div>
      ${footer}
    </div>
  `,
});

/**
 * Mixed order (both digital + physical): combined email
 */
const mixedPurchaseEmail = (data) => ({
  subject: `✅ Order Confirmed — NVS BookStore`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #1e40af;">Order Confirmed!</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Thank you for your order! Here's what to expect:</p>
      ${itemsTable(data.items)}
      <p style="font-size: 18px; font-weight: bold;">Total: ₹${data.total}</p>
      <p style="color: #64748b; font-size: 14px;">Order ID: ${data.orderId}</p>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">📱 <strong>Digital Products</strong></p>
        <p style="margin: 8px 0 0; color: #64748b; font-size: 13px;">Your digital products are ready for download from your <a href="${SITE_URL}/dashboard" style="color: #1e40af;">Digital Library</a>.</p>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; color: #334155; font-size: 14px;">📦 <strong>Physical Products</strong></p>
        <p style="margin: 8px 0 0; color: #64748b; font-size: 13px;">Your physical items are being processed. We'll update you at each step via email.</p>
      </div>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${SITE_URL}/dashboard" style="display: inline-block; padding: 12px 32px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Go to Dashboard →
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Your invoice is attached to this email.</p>
      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: bold;">💬 How was your experience?</p>
        <a href="${SITE_URL}/feedback?orderId=${data.orderId}" style="display: inline-block; padding: 8px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">Share Your Feedback</a>
      </div>
      ${footer}
    </div>
  `,
});

/**
 * Order status update email with tracking link
 */
const orderStatusEmail = (data) => {
  const statusMessages = {
    processing: 'Your order is now being processed and will be shipped soon.',
    shipped: 'Great news! Your order has been shipped and is on its way to you.',
    delivered: 'Your order has been delivered! We hope you enjoy your purchase.',
    cancelled: 'Your order has been cancelled. If you have questions, please contact us.',
    refunded: 'Your order has been refunded. The amount will be credited to your account shortly.',
  };

  const message = statusMessages[data.status] || `Your order status has been updated to ${data.status}.`;

  return {
    subject: `📢 Order ${data.status.charAt(0).toUpperCase() + data.status.slice(1)} — NVS BookStore`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #1e40af;">Order Status Update</h2>
        <p>Hi <strong>${data.customerName}</strong>,</p>
        <p>${message}</p>
        <div style="text-align: center; margin: 20px 0;">
          ${statusBadge(data.status)}
        </div>
        <p style="color: #64748b; font-size: 14px;">Order ID: ${data.orderId}</p>
        ${data.trackingNumber ? `<p style="color: #334155; font-size: 14px;">📦 Tracking Number: <strong>${data.trackingNumber}</strong></p>` : ''}
        <div style="margin: 24px 0; text-align: center;">
          <a href="${SITE_URL}/dashboard" style="display: inline-block; padding: 10px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
            Track Your Order →
          </a>
        </div>
        ${footer}
      </div>
    `,
  };
};

const printOrderEmail = (data) => ({
  subject: `🖨️ Print Order Confirmed — NVS BookStore`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #7c3aed;">Print Order Received!</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Your print order has been received and is being processed. Total: <strong>₹${data.totalPrice}</strong></p>
      <p style="color: #64748b; font-size: 14px;">Order ID: ${data.orderId}</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; color: #334155; font-size: 14px;">📦 <strong>What happens next?</strong></p>
        <p style="margin: 8px 0 0; color: #64748b; font-size: 13px;">We'll notify you when your print order is being processed, printed, and shipped. Track progress from your dashboard.</p>
      </div>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${SITE_URL}/dashboard" style="display: inline-block; padding: 10px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
          Track Your Order →
        </a>
      </div>
      ${footer}
    </div>
  `,
});

/**
 * Blog writer invitation email
 */
const blogInvitationEmail = (data) => ({
  subject: `✍️ You're Invited to Write on NVS BookStore Blog!`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #1e40af;">Blog Writer Invitation</h2>
      <p>Hi <strong>${data.userName}</strong>,</p>
      <p><strong>${data.invitedByName}</strong> has invited you to become a blog writer on NVS BookStore!</p>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">✍️ <strong>Your Permissions</strong></p>
        <ul style="color: #64748b; font-size: 13px; margin: 8px 0 0;">
          ${data.canWrite ? '<li>✅ Write blog posts</li>' : ''}
          ${data.canPublish ? '<li>✅ Publish directly</li>' : '<li>📝 Submit for review</li>'}
          ${data.canEditOwn ? '<li>✅ Edit your own posts</li>' : ''}
        </ul>
      </div>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${SITE_URL}/blog-dashboard" style="display: inline-block; padding: 12px 32px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Accept Invitation →
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Log in to your account to accept or decline this invitation from your blog dashboard.</p>
      ${footer}
    </div>
  `,
});

// ── Invoice wait helper ──────────────────────────────────

const waitForInvoice = (orderId, maxWaitMs = 10000) => {
  return new Promise((resolve) => {
    const filePath = path.join(INVOICE_DIR, `invoice_${orderId}.pdf`);
    const start = Date.now();
    const check = () => {
      if (fs.existsSync(filePath)) {
        resolve(filePath);
      } else if (Date.now() - start > maxWaitMs) {
        resolve(null);
      } else {
        setTimeout(check, 1000);
      }
    };
    check();
  });
};

// ── Detect order type ──────────────────────────────────

const getOrderType = (items) => {
  if (!items || items.length === 0) return 'physical';
  const hasDigital = items.some(i => i.format === 'digital' && (!i.subFormat || i.subFormat !== 'print-on-demand'));
  const hasPhysical = items.some(i => i.format === 'physical' || i.subFormat === 'print-on-demand');
  if (hasDigital && hasPhysical) return 'mixed';
  if (hasDigital) return 'digital';
  return 'physical';
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

    await channel.bindQueue(queue, exchange, 'order.*');
    await channel.bindQueue(queue, exchange, 'print_order.*');
    await channel.bindQueue(queue, exchange, 'blog_access.*');

    channel.consume(queue, async (msg) => {
      try {
        const event = JSON.parse(msg.content.toString());
        logger.info(`Processing email event: ${event.type}`);

        let emailConfig;
        let attachments = [];

        switch (event.type) {
          case 'order.created': {
            const orderType = getOrderType(event.data.items);

            // Pick the right email template based on what was ordered
            if (orderType === 'digital') {
              emailConfig = digitalPurchaseEmail(event.data);
            } else if (orderType === 'mixed') {
              emailConfig = mixedPurchaseEmail(event.data);
            } else {
              emailConfig = physicalPurchaseEmail(event.data);
            }

            // Wait for invoice and attach it
            const invoicePath = await waitForInvoice(event.data.orderId);
            if (invoicePath) {
              attachments.push({
                filename: `invoice_${event.data.orderId}.pdf`,
                path: invoicePath,
                contentType: 'application/pdf',
              });
              logger.info(`Invoice attached: ${invoicePath}`);
            } else {
              logger.warn(`Invoice not yet available for order ${event.data.orderId}`);
            }
            break;
          }
          case 'order.status_updated':
            emailConfig = orderStatusEmail(event.data);
            break;
          case 'print_order.created':
            emailConfig = printOrderEmail(event.data);
            break;
          case 'print_order.status_updated':
            emailConfig = orderStatusEmail({ ...event.data, customerName: event.data.customerName || 'Customer' });
            break;
          case 'blog_access.invited':
            emailConfig = blogInvitationEmail(event.data);
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
        channel.nack(msg, false, true);
      }
    });

    logger.info('Email consumer started — listening for order.* and print_order.*');
  } catch (error) {
    logger.error('Email consumer error:', error);
  }
};

module.exports = { startConsuming };
