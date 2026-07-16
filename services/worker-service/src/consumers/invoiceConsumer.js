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
      invoiceCompanyLogo: companySettings.invoiceCompanyLogo || '',
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
    const IMAGES_DIR = process.env.IMAGES_DIR || path.join(os.homedir(), 'storage', 'images');
    let logoImageLoaded = false;
    
    if (settings.invoiceCompanyLogo) {
      const fullLogoPath = path.join(IMAGES_DIR, settings.invoiceCompanyLogo);
      if (fs.existsSync(fullLogoPath)) {
        try {
          doc.image(fullLogoPath, margin, y, { height: 45 });
          logoImageLoaded = true;
        } catch (err) {
          logger.warn('Failed to embed logo image in PDF:', err.message);
        }
      }
    }

    // Company details aligned next to logo or left
    const companyTextX = logoImageLoaded ? margin + 60 : margin;
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text(settings.invoiceCompanyName, companyTextX, y);
    
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#4b5563')
      .text(settings.invoiceCompanyAddress || 'Address Not Configured', companyTextX, y + 22, { width: contentWidth - (logoImageLoaded ? 60 : 0) });
    
    doc
      .fontSize(8)
      .text(`Email: ${settings.invoiceCompanyEmail} | Phone: ${settings.invoiceCompanyPhone}`, companyTextX, y + 36);

    y += 55;
    
    // Header divider line (primary blue, 1.5pt thick)
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(1.5).stroke('#1e3a8a');
    y += 15;

    // ──── INVOICE TITLE & OVERVIEW ────
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text('TAX INVOICE', margin, y);
    
    // Invoice details on the right side
    const detailsX = margin + 280;
    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor('#1f2937')
      .text(`Invoice No: ${data.orderId || 'N/A'}`, detailsX, y);
    
    const formattedDate = new Date().toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(`Invoice Date: ${formattedDate}`, detailsX, y + 12);
    
    if (data.orderDate) {
      const orderDate = new Date(data.orderDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Order Date: ${orderDate}`, detailsX, y + 24);
    }
    
    y += 45;

    // ──── BILL TO & BUSINESS DETAILS COLUMNS ────
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(0.5).stroke('#e5e7eb');
    y += 12;

    const colWidth = (contentWidth / 2) - 10;
    
    // Column 1: Bill To
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#1e3a8a').text('BILL TO:', margin, y);
    let billY = y + 14;
    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .text(data.customerName || 'Customer', margin, billY);
    billY += 13;
    doc.font('Helvetica').fillColor('#4b5563');
    if (data.customerEmail) {
      doc.text(data.customerEmail, margin, billY);
      billY += 12;
    }
    if (data.customerPhone) {
      doc.text(`Phone: ${data.customerPhone}`, margin, billY);
      billY += 12;
    }

    // Shipping Address
    const addr = data.shippingAddress || {};
    const addrParts = [];
    if (addr.village) addrParts.push(addr.village);
    if (addr.gali) addrParts.push(addr.gali);
    if (addr.landmark) addrParts.push(`Near ${addr.landmark}`);
    if (addr.city) addrParts.push(addr.city);
    if (addr.district) addrParts.push(`Dist. ${addr.district}`);
    if (addr.pincode) addrParts.push(`PIN: ${addr.pincode}`);
    if (addr.postOffice) addrParts.push(`PO: ${addr.postOffice}`);
    if (addr.state) addrParts.push(addr.state);
    if (addr.mobile) addrParts.push(`Mob: ${addr.mobile}`);
    if (addrParts.length === 0 && addr.address) {
      addrParts.push(addr.address);
      if (addr.city) addrParts.push(addr.city);
      if (addr.state) addrParts.push(addr.state);
      if (addr.pincode) addrParts.push(addr.pincode);
    }
    if (addrParts.length > 0) {
      const line1 = addrParts.slice(0, 4).join(', ');
      const line2 = addrParts.slice(4).join(', ');
      doc.text(line1, margin, billY, { width: colWidth });
      billY += 11;
      if (line2) {
        doc.text(line2, margin, billY, { width: colWidth });
        billY += 11;
      }
    }

    // Column 2: Business details
    const rightColX = margin + colWidth + 20;
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#1e3a8a').text('BUSINESS & TAX DETAILS:', rightColX, y);
    let busY = y + 14;
    doc.fontSize(8.5).font('Helvetica').fillColor('#4b5563');
    if (settings.invoiceGSTNumber) {
      doc.text(`GSTIN: ${settings.invoiceGSTNumber}`, rightColX, busY);
      busY += 12;
    }
    if (settings.invoicePAN) {
      doc.text(`PAN: ${settings.invoicePAN}`, rightColX, busY);
      busY += 12;
    }
    if (settings.invoiceBankName) {
      doc.font('Helvetica-Bold').fillColor('#1f2937').text('Bank Account details:', rightColX, busY);
      doc.font('Helvetica').fillColor('#4b5563');
      busY += 12;
      doc.text(`Bank: ${settings.invoiceBankName}`, rightColX, busY);
      busY += 12;
      doc.text(`A/C: ${settings.invoiceBankAccountNumber}`, rightColX, busY);
      busY += 12;
      doc.text(`IFSC: ${settings.invoiceBankIFSC}`, rightColX, busY);
      busY += 12;
    }

    y = Math.max(billY + 12, busY + 12);

    // ──── ITEMS TABLE ────
    const tableY = y;
    const rowHeight = 22;
    const headerHeight = 22;

    // Header Background
    doc.rect(margin, tableY, contentWidth, headerHeight).fill('#1e3a8a');

    // Headers text
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
    const col = {
      item: margin + 10,
      format: margin + 260,
      qty: margin + 330,
      unitPrice: margin + 380,
      total: margin + 450,
    };

    doc.text('Description', col.item, tableY + 6);
    doc.text('Format', col.format, tableY + 6);
    doc.text('Qty', col.qty, tableY + 6, { width: 40, align: 'center' });
    doc.text('Unit Price', col.unitPrice, tableY + 6, { width: 60, align: 'right' });
    doc.text('Total', col.total, tableY + 6, { width: 55, align: 'right' });

    y = tableY + headerHeight;
    let rowNum = 0;

    // Physical Items
    if (physicalItems.length > 0) {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e3a8a').text('PHYSICAL PRODUCTS', margin + 5, y + 4);
      y += 16;
      
      doc.font('Helvetica').fontSize(8.5).fillColor('#1f2937');
      physicalItems.forEach((item) => {
        const bgColor = rowNum % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(margin, y, contentWidth, rowHeight).fill(bgColor);
        doc.rect(margin, y, contentWidth, rowHeight).stroke('#f3f4f6');

        const label = item.subFormat === 'print-on-demand' ? 'POD' : 'Physical';
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const totalPrice = price * qty;

        doc
          .fillColor('#1f2937')
          .text(item.title || 'Product', col.item, y + 6, { width: 240, height: 12, ellipsis: true })
          .text(label, col.format, y + 6)
          .text(String(qty), col.qty, y + 6, { width: 40, align: 'center' })
          .text(`₹${price.toFixed(2)}`, col.unitPrice, y + 6, { width: 60, align: 'right' })
          .text(`₹${totalPrice.toFixed(2)}`, col.total, y + 6, { width: 55, align: 'right' });

        y += rowHeight;
        rowNum++;
      });
      y += 4;
    }

    // Digital Items
    if (digitalItems.length > 0) {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#059669').text('DIGITAL PRODUCTS', margin + 5, y + 4);
      y += 16;
      
      doc.font('Helvetica').fontSize(8.5).fillColor('#1f2937');
      digitalItems.forEach((item) => {
        const bgColor = rowNum % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(margin, y, contentWidth, rowHeight).fill(bgColor);
        doc.rect(margin, y, contentWidth, rowHeight).stroke('#f3f4f6');

        const qty = item.quantity || 1;
        const price = item.price || 0;
        const totalPrice = price * qty;

        doc
          .fillColor('#1f2937')
          .text(item.title || 'Product', col.item, y + 6, { width: 240, height: 12, ellipsis: true })
          .text('Digital', col.format, y + 6)
          .text(String(qty), col.qty, y + 6, { width: 40, align: 'center' })
          .text(`₹${price.toFixed(2)}`, col.unitPrice, y + 6, { width: 60, align: 'right' })
          .text(`₹${totalPrice.toFixed(2)}`, col.total, y + 6, { width: 55, align: 'right' });

        y += rowHeight;
        rowNum++;
      });
      y += 4;
    }

    // Fallback fallback
    if (physicalItems.length === 0 && digitalItems.length === 0 && items.length > 0) {
      doc.font('Helvetica').fontSize(8.5).fillColor('#1f2937');
      items.forEach((item) => {
        const bgColor = rowNum % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(margin, y, contentWidth, rowHeight).fill(bgColor);
        doc.rect(margin, y, contentWidth, rowHeight).stroke('#f3f4f6');

        const qty = item.quantity || item.copies || 1;
        const price = item.price || item.pricePerCopy || 0;
        const totalPrice = price * qty;

        doc
          .fillColor('#1f2937')
          .text(item.title || 'Product', col.item, y + 6, { width: 240, height: 12, ellipsis: true })
          .text('Item', col.format, y + 6)
          .text(String(qty), col.qty, y + 6, { width: 40, align: 'center' })
          .text(`₹${price.toFixed(2)}`, col.unitPrice, y + 6, { width: 60, align: 'right' })
          .text(`₹${totalPrice.toFixed(2)}`, col.total, y + 6, { width: 55, align: 'right' });

        y += rowHeight;
        rowNum++;
      });
      y += 4;
    }

    y += 10;

    // ──── TOTALS SECTION ────
    const summaryX = margin + contentWidth - 170;
    const subtotal = items.reduce((sum, item) => sum + ((item.price || item.pricePerCopy || 0) * (item.quantity || item.copies || 1)), 0);
    const tax = data.tax || 0;
    const discount = data.discount || 0;
    const total = data.total || data.totalPrice || subtotal + tax - discount;

    doc.fontSize(8.5).font('Helvetica').fillColor('#4b5563');
    doc.text('Subtotal:', summaryX, y, { align: 'left' });
    doc.text(`₹${subtotal.toFixed(2)}`, summaryX + 80, y, { align: 'right', width: 90 });
    y += 14;

    if (discount > 0) {
      doc.text('Discount:', summaryX, y, { align: 'left' });
      doc.fillColor('#059669').text(`-₹${discount.toFixed(2)}`, summaryX + 80, y, { align: 'right', width: 90 });
      doc.fillColor('#4b5563');
      y += 14;
    }

    if (tax > 0) {
      doc.text('Tax:', summaryX, y, { align: 'left' });
      doc.text(`₹${tax.toFixed(2)}`, summaryX + 80, y, { align: 'right', width: 90 });
      y += 14;
    }

    // Draw total block
    doc.rect(summaryX - 5, y - 4, 175, 24).fill('#1e3a8a');
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('TOTAL:', summaryX, y + 2, { align: 'left' })
      .text(`₹${total.toFixed(2)}`, summaryX + 80, y + 2, { align: 'right', width: 90 });

    y += 35;

    // ──── FOOTER ────
    if (y > pageHeight - 120) {
      doc.addPage();
      y = margin;
    }

    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(0.5).stroke('#e5e7eb');
    y += 12;

    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor('#1e3a8a')
      .text('Payment Method: ', margin, y)
      .font('Helvetica')
      .fillColor('#4b5563')
      .text(data.paymentMethod || 'Online Payment', margin + 90, y);

    y += 18;

    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#9ca3af')
      .text(settings.invoiceFooterText, margin, y, { align: 'center', width: contentWidth });
    
    doc.text('This is a computer-generated document. No signature is required.', margin, y + 10, { align: 'center', width: contentWidth });

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
