# Worker Service Documentation

**Service Name:** Worker Service  
**Purpose:** Background task processing via RabbitMQ consumers  
**Package:** `@sarkari/worker-service`  
**Port:** None (background service, no HTTP server)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Consumers](#consumers)
- [Event Types](#event-types)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Monitoring](#monitoring)
- [Deployment](#deployment)

---

## 🎯 Overview

The Worker Service is a background processing service that consumes events from RabbitMQ and performs asynchronous tasks. Unlike the other services, it has no HTTP endpoints and runs continuously, listening for messages on designated queues.

### Key Responsibilities

1. **Email Notifications:** Send transactional and notification emails
2. **Invoice Generation:** Create PDF invoices and store in MinIO
3. **Cache Invalidation:** Clear Redis cache when data changes
4. **Error Recovery:** Implement retry logic and dead-letter queues

### Key Characteristics

- **Event-Driven:** Consumes messages from RabbitMQ exchanges
- **Non-Blocking:** Processes messages asynchronously
- **Fault-Tolerant:** Retry logic with exponential backoff
- **Scalable:** Run multiple instances for parallel processing
- **Idempotent:** Can safely retry failed operations

---

## 🏗️ Architecture

### Service Flow

```
┌─────────────────────────────┐
│   Other Services            │
│   (Transaction, Admin)      │
│   Publish Events            │
└──────────────┬──────────────┘
               │
        ┌──────▼──────┐
        │  RabbitMQ   │
        │  Exchanges  │
        └──────┬──────┘
               │
   ┌───────────┼───────────┐
   │           │           │
┌──▼──┐  ┌─────▼──┐  ┌────▼─┐
│Email│  │Invoice │  │Cache │
│Queue│  │Queue   │  │Queue │
└──┬──┘  └─────┬──┘  └────┬─┘
   │           │           │
   │     ┌─────▼──────────┬┴──────────┐
   │     │  Worker Service Consumers  │
   │     ├──────────────────────────┤
   │     │ - emailConsumer          │
   │     │ - invoiceConsumer        │
   │     │ - cacheConsumer          │
   │     └──────────┬───────────────┘
   │              │
   ├──────────────┼──────────────┐
   │              │              │
┌──▼────┐  ┌─────▼──┐  ┌────────▼──┐
│Nodemailer│  │PDFKit   │  │Redis Cache│
│(SMTP)   │  │(PDF)    │  │           │
└─────────┘  └────┬────┘  └───────────┘
                  │
            ┌─────▼──────┐
            │  MinIO      │
            │  (Storage)  │
            └─────────────┘
```

### Message Flow

```
1. Transaction Service publishes event
   ↓
2. Event routed to appropriate RabbitMQ queue
   ↓
3. Worker Service consumer receives message
   ↓
4. Consumer processes message
   ↓
5. If successful: ACK message
   If failed: NAK/retry/dead-letter queue
   ↓
6. Log result
```

---

## 👨‍💼 Consumers

### 1. Email Consumer

**Purpose:** Send transactional emails via SMTP (Nodemailer)

**Queue:** `sarkari.email.events`

#### Message Format

```javascript
{
  event: 'order.created',
  timestamp: '2026-02-19T10:30:00Z',
  data: {
    orderId: 'order123',
    userId: 'user456',
    userEmail: 'customer@example.com',
    userName: 'John Doe',
    items: [
      { title: 'Book Title', quantity: 2, price: 299.99 }
    ],
    total: 599.98,
    trackingNumber: 'TRACK123' // optional, for shipped emails
  }
}
```

#### Email Templates

```
├── order-confirmation
│   └── Sent when order is created
│
├── order-shipped
│   └── Sent when order status changes to 'shipped'
│
├── order-delivered
│   └── Sent when order is delivered
│
├── invoice-ready
│   └── Sent when invoice is ready
│
├── user-welcome
│   └── Sent on new user signup
│
└── password-reset
    └── Sent for password reset requests
```

#### Template Example (order-confirmation)

```handlebars
<h1>Order Confirmation</h1>
<p>Hi {{userName}},</p>
<p>Thank you for your order! Here are the details:</p>

<h3>Order #{{orderId}}</h3>
<table>
  {{#each items}}
  <tr>
    <td>{{title}}</td>
    <td>{{quantity}} x {{price}}</td>
    <td>{{total}}</td>
  </tr>
  {{/each}}
</table>

<p><strong>Total: {{total}}</strong></p>

<p>We'll send you a tracking number when your order ships.</p>
```

#### Retry Logic

```javascript
const retryConfig = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialBackoff: 1000  // 1 second
};

// Retry schedule: 1s, 2s, 4s
```

#### Implementation

```javascript
class EmailConsumer {
  async startConsuming() {
    const channel = await connection.createChannel();
    const queue = 'sarkari.email.events';
    
    await channel.assertQueue(queue, { durable: true });
    
    channel.consume(queue, async (msg) => {
      try {
        const content = JSON.parse(msg.content.toString());
        await this.sendEmail(content);
        channel.ack(msg);
      } catch (error) {
        logger.error('Email send failed:', error);
        // Retry or dead-letter
        channel.nack(msg, false, true);  // Requeue
      }
    });
  }

  async sendEmail(message) {
    const { data, event } = message;
    const template = this.getTemplate(event);
    const html = await this.renderTemplate(template, data);
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: data.userEmail,
      subject: this.getSubject(event),
      html: html
    });
  }
}
```

---

### 2. Invoice Consumer

**Purpose:** Generate PDF invoices and store in MinIO

**Queue:** `sarkari.invoice.events`

#### Message Format

```javascript
{
  event: 'invoice.generate',
  timestamp: '2026-02-19T10:30:05Z',
  data: {
    orderId: 'order123',
    userId: 'user456',
    invoiceNumber: 'INV-2026-001234',
    invoiceDate: '2026-02-19',
    items: [
      {
        title: 'Book Title',
        quantity: 2,
        unitPrice: 299.99,
        total: 599.98
      }
    ],
    subtotal: 599.98,
    tax: 0,
    total: 599.98,
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US'
    }
  }
}
```

#### PDF Generation

```javascript
class InvoiceConsumer {
  async generateInvoice(invoiceData) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const fileName = `invoice-${invoiceData.invoiceNumber}.pdf`;
      
      // Title
      doc.fontSize(20).text('INVOICE', 100, 100);
      doc.fontSize(10);
      doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, 100, 140);
      doc.text(`Date: ${invoiceData.invoiceDate}`, 100, 160);
      
      // Items table
      doc.fontSize(12).text('Items', 100, 220);
      let y = 240;
      invoiceData.items.forEach(item => {
        doc.fontSize(10).text(
          `${item.title} x${item.quantity} @ $${item.unitPrice} = $${item.total}`,
          100,
          y
        );
        y += 20;
      });
      
      // Totals
      y += 20;
      doc.fontSize(12).text(`Total: $${invoiceData.total}`, 100, y);
      
      // Upload to MinIO
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        this.uploadToMinIO(fileName, buffer).then(resolve).catch(reject);
      });
      
      doc.end();
    });
  }

  async uploadToMinIO(fileName, buffer) {
    const client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
      useSSL: false
    });

    await client.putObject('invoices', fileName, buffer);
    return `https://minio.example.com/invoices/${fileName}`;
  }
}
```

#### Retry Logic

```javascript
const retryConfig = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialBackoff: 2000  // 2 seconds (longer than email)
};
```

---

### 3. Cache Invalidation Consumer

**Purpose:** Clear Redis cache when data changes

**Queue:** `sarkari.cache.events`

#### Message Format

```javascript
{
  event: 'cache.invalidate',
  timestamp: '2026-02-19T10:30:10Z',
  data: {
    keys: ['products:id:123', 'products:page:*'],
    pattern: true
  }
}
```

#### Implementation

```javascript
class CacheConsumer {
  async startConsuming() {
    const channel = await connection.createChannel();
    const queue = 'sarkari.cache.events';
    
    await channel.assertQueue(queue, { durable: true });
    
    channel.consume(queue, async (msg) => {
      try {
        const content = JSON.parse(msg.content.toString());
        await this.invalidateCache(content.data);
        channel.ack(msg);
      } catch (error) {
        logger.error('Cache invalidation failed:', error);
        channel.nack(msg, false, false);  // Don't requeue
      }
    });
  }

  async invalidateCache(data) {
    const redis = require('redis').createClient(process.env.REDIS_URL);
    await redis.connect();

    if (data.pattern) {
      // Pattern deletion
      for (const pattern of data.keys) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(keys);
          logger.info(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
        }
      }
    } else {
      // Exact deletion
      await redis.del(data.keys);
      logger.info(`Deleted ${data.keys.length} keys`);
    }

    await redis.disconnect();
  }
}
```

#### Trigger Cache Invalidation

From other services:
```javascript
// When product is updated
await producer.publish('sarkari.events', 'sarkari.cache.events', {
  event: 'cache.invalidate',
  timestamp: new Date(),
  data: {
    keys: [
      `products:id:${productId}`,
      'products:page:*',
      'search:*'
    ],
    pattern: true
  }
});
```

---

## 📬 Event Types

### Order Events

```javascript
{
  event: 'order.created',
  data: {
    orderId: '...',
    userId: '...',
    userEmail: '...',
    items: [...],
    total: 599.98
  }
}

{
  event: 'order.shipped',
  data: {
    orderId: '...',
    trackingNumber: '...'
  }
}

{
  event: 'order.delivered',
  data: {
    orderId: '...',
    deliveryDate: '...'
  }
}
```

### Payment Events

```javascript
{
  event: 'payment.completed',
  data: {
    orderId: '...',
    amount: 599.98,
    method: 'credit_card'
  }
}

{
  event: 'payment.failed',
  data: {
    orderId: '...',
    reason: '...'
  }
}
```

### Product Events

```javascript
{
  event: 'product.updated',
  data: {
    productId: '...',
    changes: { stock: 100 }
  }
}

{
  event: 'product.deleted',
  data: {
    productId: '...'
  }
}
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- RabbitMQ 3.12+
- MongoDB 7+ (secondary replica for reads)
- Redis 7+
- MinIO (for invoice storage)
- pnpm 10.30.0+

### Installation

```bash
# From root directory
pnpm install

# Navigate to service
cd services/worker-service
pnpm install
```

### Configuration

Create `.env` file:

```env
NODE_ENV=development
LOG_LEVEL=debug

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# MongoDB (read-only)
MONGODB_SECONDARY_URI=mongodb://localhost:27018/nvsbookstore?replicaSet=rs0

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@nvsbookstore.com

# Service
SERVICE_NAME=worker-service
```

### Start Service

```bash
# Development
pnpm dev

# Production
pnpm start
```

### Verify Installation

```bash
# Check logs
tail -f logs/worker-service.log

# Test RabbitMQ connection
curl http://localhost:15672
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RABBITMQ_URL` | - | RabbitMQ connection URL |
| `MONGODB_SECONDARY_URI` | - | MongoDB secondary replica |
| `REDIS_URL` | - | Redis connection URL |
| `MINIO_ENDPOINT` | - | MinIO server endpoint |
| `MINIO_ACCESS_KEY` | - | MinIO access key |
| `MINIO_SECRET_KEY` | - | MinIO secret key |
| `SMTP_HOST` | - | Email SMTP host |
| `SMTP_PORT` | 587 | SMTP port |
| `SMTP_USER` | - | SMTP username |
| `SMTP_PASSWORD` | - | SMTP password |

### RabbitMQ Configuration

```javascript
const config = {
  exchanges: {
    main: {
      name: 'sarkari.events',
      type: 'direct',
      durable: true
    }
  },
  queues: {
    email: {
      name: 'sarkari.email.events',
      durable: true,
      arguments: {
        'x-message-ttl': 86400000,  // 24 hours
        'x-dead-letter-exchange': 'sarkari.dlx'
      }
    },
    invoice: {
      name: 'sarkari.invoice.events',
      durable: true,
      arguments: {
        'x-message-ttl': 86400000
      }
    },
    cache: {
      name: 'sarkari.cache.events',
      durable: true,
      arguments: {
        'x-message-ttl': 3600000  // 1 hour
      }
    }
  }
};
```

---

## 🔄 Error Handling

### Retry Strategy

```javascript
class RetryHandler {
  constructor(maxRetries = 3, backoffMultiplier = 2, initialBackoff = 1000) {
    this.maxRetries = maxRetries;
    this.backoffMultiplier = backoffMultiplier;
    this.initialBackoff = initialBackoff;
  }

  getBackoffTime(attempt) {
    return this.initialBackoff * Math.pow(this.backoffMultiplier, attempt);
  }

  shouldRetry(attempt, error) {
    // Retry on network errors, timeouts, temporary failures
    const retriable = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'NetworkError'
    ];

    return attempt < this.maxRetries && 
           retriable.some(err => error.message.includes(err));
  }
}
```

### Dead Letter Queue

Messages that fail after retries are sent to Dead Letter Exchange:

```javascript
await channel.assertExchange('sarkari.dlx', 'direct', { durable: true });
await channel.assertQueue('sarkari.dlq', { durable: true });
await channel.bindQueue('sarkari.dlq', 'sarkari.dlx', '');

// Failed message format
{
  originalMessage: {...},
  error: 'Email sending failed',
  attempts: 3,
  lastAttempt: '2026-02-19T10:35:00Z',
  handledAt: '2026-02-19T10:40:00Z'
}
```

---

## 📊 Monitoring

### Metrics

```javascript
const metrics = {
  processedMessages: 0,
  failedMessages: 0,
  retriedMessages: 0,
  averageProcessingTime: 0,
  queueDepth: {
    email: 0,
    invoice: 0,
    cache: 0
  }
};
```

### Health Check

```bash
# Check RabbitMQ queue status
docker exec rabbitmq rabbitmqctl list_queues name messages

# Check consumer status
curl http://localhost:15672/api/consumers -u guest:guest
```

### Logging

```javascript
logger.info('Email sent', { 
  orderId: '...', 
  email: '...', 
  processingTime: 250 
});

logger.error('Invoice generation failed', {
  orderId: '...',
  error: error.message,
  attempt: 2,
  retryIn: 4000
});
```

---

## 🚀 Deployment

### Docker

```bash
docker build -f Dockerfile.service -t worker-service:latest .
docker run \
  -e RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672 \
  -e MONGODB_SECONDARY_URI=mongodb://... \
  -e REDIS_URL=redis://... \
  -e SMTP_HOST=smtp.gmail.com \
  worker-service:latest
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker-service
spec:
  replicas: 2  # Scale based on message volume
  selector:
    matchLabels:
      app: worker-service
  template:
    metadata:
      labels:
        app: worker-service
    spec:
      containers:
      - name: worker-service
        image: worker-service:latest
        env:
        - name: RABBITMQ_URL
          valueFrom:
            secretKeyRef:
              name: rabbitmq-creds
              key: url
        - name: MONGODB_SECONDARY_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-creds
              key: secondary-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Scaling

- **Horizontal:** Deploy multiple Worker Service instances
- **Queue Scaling:** RabbitMQ distributes messages across consumers
- **Resource Allocation:** Allocate more CPU/memory for high-volume processing

---

## 🔍 Troubleshooting

### Common Issues

**Issue:** Messages not being processed
- Check RabbitMQ connection: `rabbitmqctl status`
- Verify queue bindings
- Check consumer logs

**Issue:** Email sending fails
- Verify SMTP credentials
- Check firewall/network access
- Test SMTP connection manually

**Issue:** High queue depth
- Add more Worker Service instances
- Increase message processing rate
- Check for stuck messages

### Debug Mode

```bash
DEBUG=worker-service* npm run dev
```

---

**Last Updated:** February 2026
