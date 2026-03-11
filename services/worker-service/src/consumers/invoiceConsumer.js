// Invoice Consumer
// Generates PDF invoices for orders, stores to ~/storage/invoices, updates Order document

const amqp = require('amqplib');
const PDFDocument = require('pdfkit');
const logger = require('@sarkari/logger');
const { Order, SiteSettings } = require('@sarkari/database').models;
const os = require('os');
const path = require('path');
const fs = require('fs');

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const INVOICE_DIR = path.join(os.homedir(), 'storage', 'invoices');

/**
 * Generate a professional invoice PDF with enhanced layout, logo support, and business details
 */
const generateInvoice = (data, companySettings = {}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Use provided settings or defaults
    const settings = {
      invoiceCompanyName: companySettings.invoiceCompanyName || 'NVS BookStore',
      invoiceCompanyEmail: companySettings.invoiceCompanyEmail || 'support@nvsbookstore.com',
      invoiceCompanyPhone: companySettings.invoiceCompanyPhone || '+91-XXXX-XXXX',
      invoiceCompanyAddress: companySettings.invoiceCompanyAddress || '',
      invoiceCompanyLogo: companySettings.invoiceCompanyLogo || '📚',
      invoiceGSTNumber: companySettings.invoiceGSTNumber || '',
      invoicePAN: companySettings.invoicePAN || '',
      invoiceBankName: companySettings.invoiceBankName || '',
      invoiceBankAccountNumber: companySettings.invoiceBankAccountNumber || '',
      invoiceBankIFSC: companySettings.invoiceBankIFSC || '',
      invoiceFooterText: companySettings.invoiceFooterText || 'Thank you for your purchase! We appreciate your business.',
    };

    const items = data.items || [];
    const physicalItems = items.filter((i) => i.format === 'physical' || i.subFormat === 'print-on-demand');
    const digitalItems = items.filter((i) => i.format === 'digital' && i.subFormat !== 'print-on-demand');

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    
    let y = margin;

    // ──── HEADER: Company Logo & Details ────
    const logoAreaHeight = 80;
    
    // Background color for header
    doc.rect(0, 0, pageWidth, y + logoAreaHeight + 10).fillAndStroke('#f5f5f5', '#e5e7eb');
    
    // Company Logo Area (left side)
    doc.fillColor('#1e3a8a').fontSize(28).font('Helvetica-Bold').text('[LOGO]', margin + 10, y + 20);
    
    // Company Name & Tagline (center/right)
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text(settings.invoiceCompanyName, margin + 50, y + 15, { width: contentWidth - 50 });
    
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(settings.invoiceCompanyAddress || 'Company Address Not Set', margin + 50, y + 42, { width: contentWidth - 50 });
    
    doc
      .fontSize(8)
      .fillColor('#888888')
      .text(`Email: ${settings.invoiceCompanyEmail} | Phone: ${settings.invoiceCompanyPhone}`, margin + 50, y + 56, { width: contentWidth - 50 });
    
    y += logoAreaHeight + 15;

    // ──── INVOICE TITLE & DETAILS ROW ────
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text('INVOICE', margin, y, { width: contentWidth / 2 });
    
    // Invoice Number & Date (right side)
    const invoiceDetailsX = margin + contentWidth / 2;
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#000000')
      .text(`Invoice #: ${data.orderId || 'N/A'}`, invoiceDetailsX, y);
    
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(`Invoice Date: ${formattedDate}`, invoiceDetailsX, y + 15);
    
    if (data.orderDate) {
      const orderDate = new Date(data.orderDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Order Date: ${orderDate}`, invoiceDetailsX, y + 30);
    }
    
    y += 55;

    // ──── BILLING & SHIPPING INFO ────
    // Divider line
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke('#ddd');
    y += 15;

    // Two-column layout for customer info
    const colWidth = (contentWidth / 2) - 10;
    
    // Left column: Billing Address
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a8a').text('BILL TO:', margin, y);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#000000')
      .text(data.customerName || 'Customer', margin, y + 18)
      .text(data.customerEmail || '', margin, y + 33);
    
    if (data.customerPhone) {
      doc.text(`Phone: ${data.customerPhone}`, margin, y + 48);
    }

    // Right column: Order Info
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text('ORDER DETAILS:', margin + colWidth + 20, y);
    
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#000000')
      .text(`Status: Confirmed`, margin + colWidth + 20, y + 18)
      .text(`Items: ${items.length}`, margin + colWidth + 20, y + 33)
      .text(`Order ID: ${data.orderId}`, margin + colWidth + 20, y + 48);
    
    y += 75;

    // ──── ITEMS TABLE ────
    const tableY = y;
    const rowHeight = 22;
    const headerHeight = 25;

    // Table header background
    doc.rect(margin, tableY, contentWidth, headerHeight).fillAndStroke('#1e3a8a', '#1e3a8a');

    // Table headers
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#ffffff');

    const col = {
      item: margin + 10,
      format: margin + 280,
      qty: margin + 360,
      unitPrice: margin + 410,
      total: margin + 480,
    };

    doc.text('Description', col.item, tableY + 5);
    doc.text('Type', col.format, tableY + 5);
    doc.text('Qty', col.qty, tableY + 5, { align: 'center' });
    doc.text('Unit Price', col.unitPrice, tableY + 5, { align: 'right' });
    doc.text('Total', col.total, tableY + 5, { align: 'right' });

    y = tableY + headerHeight;
    let rowNum = 0;

    // ─── Physical Items Section ───
    if (physicalItems.length > 0) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af').text('PHYSICAL / PRINT-ON-DEMAND ITEMS', margin + 10, y + 3);
      y += rowHeight;

      doc.font('Helvetica').fillColor('#000000').fontSize(9);
      physicalItems.forEach((item, idx) => {
        const bgColor = rowNum % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(margin, y, contentWidth, rowHeight).fill(bgColor);

        const label = item.subFormat === 'print-on-demand' ? 'POD' : 'Physical';
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const totalPrice = price * qty;

        doc
          .fillColor('#000000')
          .text(item.title || 'Product', col.item, y + 5, { width: 250 })
          .text(label, col.format, y + 5)
          .text(String(qty), col.qty, y + 5, { align: 'center' })
          .text(`₹${price.toFixed(2)}`, col.unitPrice, y + 5, { align: 'right' })
          .text(`₹${totalPrice.toFixed(2)}`, col.total, y + 5, { align: 'right' });

        y += rowHeight;
        rowNum++;
      });

      y += 5;
    }

    // ─── Digital Items Section ───
    if (digitalItems.length > 0) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#059669').text('DIGITAL PRODUCTS (INSTANT DELIVERY)', margin + 10, y + 3);
      y += rowHeight;

      doc.font('Helvetica').fillColor('#000000').fontSize(9);
      digitalItems.forEach((item, idx) => {
        const bgColor = rowNum % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(margin, y, contentWidth, rowHeight).fill(bgColor);

        const qty = item.quantity || 1;
        const price = item.price || 0;
        const totalPrice = price * qty;

        doc
          .fillColor('#000000')
          .text(item.title || 'Product', col.item, y + 5, { width: 250 })
          .text('Digital', col.format, y + 5)
          .text(String(qty), col.qty, y + 5, { align: 'center' })
          .text(`₹${price.toFixed(2)}`, col.unitPrice, y + 5, { align: 'right' })
          .text(`₹${totalPrice.toFixed(2)}`, col.total, y + 5, { align: 'right' });

        y += rowHeight;
        rowNum++;
      });

      y += 5;
    }

    // ─── No items fallback ───
    if (physicalItems.length === 0 && digitalItems.length === 0 && items.length > 0) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#4b5563').text('ALL ITEMS', margin + 10, y + 3);
      y += rowHeight;

      doc.font('Helvetica').fillColor('#000000').fontSize(9);
      items.forEach((item, idx) => {
        const bgColor = rowNum % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(margin, y, contentWidth, rowHeight).fill(bgColor);

        const qty = item.quantity || item.copies || 1;
        const price = item.price || item.pricePerCopy || 0;
        const totalPrice = price * qty;

        doc
          .fillColor('#000000')
          .text(item.title || 'Product', col.item, y + 5, { width: 250 })
          .text('Item', col.format, y + 5)
          .text(String(qty), col.qty, y + 5, { align: 'center' })
          .text(`₹${price.toFixed(2)}`, col.unitPrice, y + 5, { align: 'right' })
          .text(`₹${totalPrice.toFixed(2)}`, col.total, y + 5, { align: 'right' });

        y += rowHeight;
        rowNum++;
      });
    }

    y += 10;

    // ──── SUMMARY SECTION ────
    const summaryX = margin + contentWidth - 180;
    const subtotal = items.reduce((sum, item) => sum + ((item.price || item.pricePerCopy || 0) * (item.quantity || item.copies || 1)), 0);
    const tax = data.tax || 0;
    const discount = data.discount || 0;
    const total = data.total || data.totalPrice || subtotal + tax - discount;

    // Subtotal
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Subtotal:', summaryX, y, { align: 'left' })
      .text(`₹${subtotal.toFixed(2)}`, summaryX + 100, y, { align: 'right' });

    y += 18;

    // Discount
    if (discount > 0) {
      doc.text('Discount:', summaryX, y, { align: 'left' });
      doc.fillColor('#059669').text(`-₹${discount.toFixed(2)}`, summaryX + 100, y, { align: 'right' });
      doc.fillColor('#666666');
      y += 18;
    }

    // Tax
    if (tax > 0) {
      doc.text('Tax (GST):', summaryX, y, { align: 'left' });
      doc.text(`₹${tax.toFixed(2)}`, summaryX + 100, y, { align: 'right' });
      y += 18;
    }

    // Total box
    doc.rect(summaryX - 10, y - 5, 180 + 20, 30).fillAndStroke('#1e3a8a', '#1e3a8a');
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('TOTAL:', summaryX, y + 3, { align: 'left' })
      .text(`₹${total.toFixed(2)}`, summaryX + 100, y + 3, { align: 'right' });

    y += 40;

    // ──── PAYMENT & DELIVERY INFO ────
    if (y > pageHeight - 150) {
      doc.addPage();
      y = margin;
    }

    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke('#ddd');
    y += 15;

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text('PAYMENT METHOD:', margin, y);
    
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666666')
      .text(data.paymentMethod || 'Online Payment', margin, y + 15);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text('DELIVERY STATUS:', margin + 280, y);
    
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#059669')
      .text('Order Confirmed', margin + 280, y + 15);

    y += 35;

    // ──── FOOTER ────
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).stroke('#ddd');
    y += 12;

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#888888')
      .text(settings.invoiceFooterText, margin, y, { align: 'center' });
    
    doc.text('This is a computer-generated invoice. No signature required.', margin, y + 12, { align: 'center' });
    
    doc.text(`Generated on ${formattedDate}`, margin, y + 24, { align: 'center', width: contentWidth, color: '#aaa' });

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

        // Fetch company settings
        let companySettings = {};
        try {
          const siteSettings = await SiteSettings.getInstance();
          companySettings = {
            invoiceCompanyName: siteSettings.invoiceCompanyName,
            invoiceCompanyEmail: siteSettings.invoiceCompanyEmail,
            invoiceCompanyPhone: siteSettings.invoiceCompanyPhone,
            invoiceCompanyAddress: siteSettings.invoiceCompanyAddress,
            invoiceCompanyLogo: siteSettings.invoiceCompanyLogo,
            invoiceGSTNumber: siteSettings.invoiceGSTNumber,
            invoicePAN: siteSettings.invoicePAN,
            invoiceBankName: siteSettings.invoiceBankName,
            invoiceBankAccountNumber: siteSettings.invoiceBankAccountNumber,
            invoiceBankIFSC: siteSettings.invoiceBankIFSC,
            invoiceFooterText: siteSettings.invoiceFooterText,
          };
        } catch (settingsErr) {
          logger.warn('Failed to fetch company settings, using defaults:', settingsErr.message);
        }

        const pdfBuffer = await generateInvoice(event.data, companySettings);
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
