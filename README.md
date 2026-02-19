# NVS Bookstore - E-Commerce Platform

A modern, scalable e-commerce platform for books built with a microservices architecture. The system leverages a Next.js frontend with a distributed backend infrastructure for high performance and reliability.

**Version:** 1.0.0  
**Last Updated:** February 2026

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Services Documentation](#services-documentation)
- [Infrastructure](#infrastructure)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🎯 Project Overview

NVS Bookstore is an enterprise-grade e-commerce platform designed to handle high-traffic scenarios while maintaining data consistency and security. The application is built following microservices principles with clear separation of concerns:

- **Read-optimized operations** for high-traffic browsing
- **Transaction-critical operations** for secure payments and orders
- **Admin operations** for content management and file uploads
- **Background processing** for emails and report generation
- **Modern frontend** built with Next.js 14+ and React 19

### Key Features

- 📚 Product catalog with advanced filtering and search
- 🛒 Shopping cart and checkout system
- 💳 Payment processing and order management
- 👤 User authentication (email/password and OAuth)
- 🔐 Role-based access control (User/Admin)
- 📧 Email notifications and order confirmations
- 📊 Admin dashboard for content management
- 🏪 Inventory management
- 📱 Responsive design

---

## 🏗️ Architecture

### Microservices Architecture

The platform uses a **microservices architecture** with the following components:

```
┌─────────────────────────────────────────┐
│         Next.js Frontend (Web)          │
│  - Product Catalog                      │
│  - Shopping Cart                        │
│  - Checkout & Auth                      │
│  - Admin Dashboard                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────┴──────────────────────────────────────────────────────┐
│                    API Layer (Services)                            │
├─────────────────────┬────────────────────┬────────────────────┬──────┤
│ Read Service        │ Transaction        │ Admin Service      │Worker│
│ (Port 3001)         │ Service            │ (Port 3003)        │Svc   │
│ - Products          │ (Port 3002)        │ - Upload Files     │(No   │
│ - Notifications     │ - Auth/Login       │ - Manage Products  │Port) │
│ - Tags              │ - Orders           │ - User Management  │ - BG │
│ - High-traffic      │ - Cart             │ - Admin only       │  Proc│
│   reads             │ - Payments         │                    │      │
│ - Redis cached      │ - Critical ops     │                    │      │
└─────────────────────┴────────────────────┴────────────────────┴──────┘
               │
┌──────────────┴────────────────────────────────────────┐
│          Infrastructure Layer                        │
├─────────────────┬──────────────┬────────────┬─────────┤
│  MongoDB        │  Redis       │  MinIO     │RabbitMQ │
│  Replica Set    │  Cache       │  Storage   │ Message │
│  - Primary      │  - Sessions  │  - Files   │ Broker  │
│  - Secondary    │  - Cache     │  - Docs    │         │
│  - Arbiter      │              │            │         │
└─────────────────┴──────────────┴────────────┴─────────┘
```

### Data Flow Patterns

1. **Read Operations:**
   - Frontend → Read Service → Redis (cache) → MongoDB Secondary
   - If cache miss, Read Service queries MongoDB and caches result

2. **Write Operations:**
   - Frontend → Transaction Service → MongoDB Primary
   - Transaction Service publishes events to RabbitMQ
   - Worker Service consumes events (email, invoices, cache invalidation)

3. **Admin Operations:**
   - Admin Frontend → Admin Service (auth required) → MongoDB Primary + MinIO
   - Admin Service uploads files to MinIO
   - Events published for background processing

---

## 💻 Tech Stack

### Frontend
- **Next.js 14+** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Utility-first CSS
- **TipTap** - Rich text editor for content creation
- **Framer Motion** - Animations and transitions
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library

### Backend Services
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript/JavaScript** - Development languages

### Databases & Caching
- **MongoDB 7** - Primary database (replica set)
- **Redis 7** - Caching layer
- **MinIO** - Object storage (S3-compatible)

### Message Queue & Communication
- **RabbitMQ 3.12** - Message broker for async operations

### Additional Tools
- **pnpm** - Monorepo package manager
- **Turbo** - Monorepo build orchestration
- **Docker** - Containerization
- **nginx** - Reverse proxy
- **ESLint** - Code linting

---

## 📁 Project Structure

```
nvsbookstore/
├── apps/                          # Applications
│   └── web/                        # Next.js frontend application
│       ├── src/
│       │   ├── app/               # Next.js 14+ App Router
│       │   │   ├── page.jsx        # Home page
│       │   │   ├── layout.jsx      # Root layout
│       │   │   ├── admin/          # Admin dashboard routes
│       │   │   ├── auth/           # Authentication routes
│       │   │   ├── store/          # Store/catalog pages
│       │   │   ├── cart/           # Cart & checkout
│       │   │   ├── profile/        # User profile
│       │   │   ├── dashboard/      # User dashboard
│       │   │   └── [...]           # Other routes
│       │   ├── components/         # React components
│       │   │   ├── admin/          # Admin UI components
│       │   │   ├── auth/           # Auth components
│       │   │   ├── store/          # Store components
│       │   │   ├── ui/             # Base UI components
│       │   │   ├── layout/         # Layout components
│       │   │   └── sections/       # Page sections
│       │   ├── context/            # React context providers
│       │   ├── lib/                # Utility functions
│       │   └── styles/             # Global styles
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       └── Dockerfile
│
├── services/                       # Backend microservices
│   ├── read-service/               # Read operations service
│   │   ├── src/
│   │   │   ├── controllers/        # Route handlers
│   │   │   ├── routes/             # API routes
│   │   │   ├── cache/              # Redis client
│   │   │   ├── middleware/         # Express middleware
│   │   │   └── index.js            # Entry point
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── transaction-service/        # Transaction & auth service
│   │   ├── src/
│   │   │   ├── controllers/        # Business logic
│   │   │   ├── routes/             # API routes
│   │   │   ├── events/             # Event producers
│   │   │   ├── middleware/         # Express middleware
│   │   │   └── index.js            # Entry point
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── admin-service/              # Admin operations service
│   │   ├── src/
│   │   │   ├── controllers/        # Admin handlers
│   │   │   ├── routes/             # Admin API routes
│   │   │   ├── storage/            # MinIO client
│   │   │   ├── utils/              # Utilities
│   │   │   └── index.js            # Entry point
│   │   ├── package.json
│   │   └── Dockerfile
│   └── worker-service/             # Background tasks service
│       ├── src/
│       │   ├── consumers/          # RabbitMQ consumers
│       │   │   ├── emailConsumer
│       │   │   ├── invoiceConsumer
│       │   │   └── cacheConsumer
│       │   ├── lib/                # Utilities
│       │   └── index.js            # Entry point
│       ├── package.json
│       └── Dockerfile
│
├── packages/                       # Shared packages (monorepo)
│   ├── database/                   # Database connection & models
│   │   ├── src/
│   │   │   ├── connection.js       # MongoDB connection
│   │   │   └── models/             # Mongoose schemas
│   │   └── package.json
│   ├── auth/                       # Authentication utilities
│   │   ├── index.js                # JWT verification, middleware
│   │   └── package.json
│   └── logger/                     # Logging utility
│       ├── index.js                # Centralized logging
│       └── package.json
│
├── infrastructure/                 # Infrastructure configuration
│   ├── mongo/                      # MongoDB setup
│   │   ├── init-replica.sh         # Replica set initialization
│   │   └── init-replica.js
│   ├── nginx/                      # Nginx reverse proxy
│   │   └── nginx.conf
│   └── minio/                      # MinIO setup
│       └── create-buckets.sh       # Bucket initialization
│
├── scripts/                        # Utility scripts
│   └── migrate.js                  # Database migration
│
├── docker-compose.yml              # Multi-container orchestration
├── docker-compose.prod.yml         # Production configuration
├── Dockerfile.service              # Service dockerfile template
├── Dockerfile.web                  # Web dockerfile template
├── pnpm-workspace.yaml             # Workspace configuration
├── pnpm-lock.yaml                  # Lock file
├── package.json                    # Root package.json
└── README.md                       # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** 18.x or higher
- **pnpm:** 10.30.0 or higher (package manager)
- **Docker:** 20.10+ and Docker Compose 2.0+
- **MongoDB:** 7 (or use Docker)
- **Redis:** 7 (or use Docker)
- **RabbitMQ:** 3.12 (or use Docker)
- **MinIO:** Latest (or use Docker)

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd nvsbookstore
```

#### 2. Install Dependencies

```bash
pnpm install
```

This will install dependencies for all packages and services in the monorepo.

#### 3. Set Up Environment Variables

Create `.env.local` in each service directory:

**Root `.env.local`:**
```env
# MongoDB
MONGODB_URI=mongodb://mongo-primary:27017/nvsbookstore?replicaSet=rs0
MONGODB_SECONDARY_URI=mongodb://mongo-secondary:27017/nvsbookstore?replicaSet=rs0

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Session
SESSION_SECRET=your-session-secret
```

**Web App (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_READ_SERVICE_URL=http://localhost:3001
NEXT_PUBLIC_TRANSACTION_SERVICE_URL=http://localhost:3002
NEXT_PUBLIC_ADMIN_SERVICE_URL=http://localhost:3003

# Optional: OAuth providers
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

#### 4. Start Infrastructure

Using Docker Compose:

```bash
# Start all services
pnpm docker:up

# Initialize MongoDB replica set
docker exec mongo-init bash /init-replica.sh

# Create MinIO buckets
docker exec minio bash /create-buckets.sh
```

#### 5. Run Services in Development Mode

```bash
# Start all services with hot reload
pnpm dev

# Or start individual services
pnpm --filter @sarkari/web dev        # Frontend (port 3000)
pnpm --filter @sarkari/read-service dev        # Read Service (port 3001)
pnpm --filter @sarkari/transaction-service dev # Transaction Service (port 3002)
pnpm --filter @sarkari/admin-service dev       # Admin Service (port 3003)
pnpm --filter @sarkari/worker-service dev      # Worker Service (background)
```

#### 6. Access the Application

- **Frontend:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin
- **RabbitMQ Management:** http://localhost:15672 (guest/guest)
- **MinIO Console:** http://localhost:9001 (minioadmin/minioadmin)

---

## 📚 Services Documentation

### 1. Read Service

**Purpose:** High-performance read operations for product catalogs, notifications, and tags with Redis caching.

**Location:** [services/read-service](services/read-service)

**Features:**
- Cache-first reads with automatic invalidation
- MongoDB secondary replica queries
- Optimized for high-traffic scenarios
- Distributed caching strategy

**Endpoints:**
```
GET    /api/products              # Get all products
GET    /api/products/:id          # Get product details
GET    /api/products/search       # Search products
GET    /api/notifications         # Get notifications
GET    /api/tags                  # Get all tags
POST   /api/cache/invalidate      # Cache invalidation (internal)
GET    /health                    # Health check
```

**Dependencies:**
- MongoDB (secondary replica)
- Redis
- Express.js

**Startup:** `pnpm --filter @sarkari/read-service dev`

**Port:** 3001

---

### 2. Transaction Service

**Purpose:** Critical operations for authentication, payments, orders, and cart management.

**Location:** [services/transaction-service](services/transaction-service)

**Features:**
- Secure user authentication (JWT + password hashing)
- Order management and payment processing
- Shopping cart operations
- Event publishing for background jobs
- Role-based access control

**Endpoints:**
```
# Authentication (Public)
POST   /api/auth/signup           # User registration
POST   /api/auth/login            # User login
POST   /api/auth/google           # Google OAuth
POST   /api/auth/refresh          # Refresh JWT token
GET    /api/auth/me               # Get current user

# Orders (Protected)
POST   /api/orders                # Create order
GET    /api/orders/:id            # Get order details
GET    /api/orders                # List user orders
PUT    /api/orders/:id            # Update order status

# Cart (Protected)
GET    /api/cart                  # Get cart
POST   /api/cart/items            # Add to cart
DELETE /api/cart/items/:itemId    # Remove from cart
PUT    /api/cart/items/:itemId    # Update cart item

# Print Orders (Protected)
POST   /api/print-orders          # Create print order
GET    /api/print-orders/:id      # Get print order

GET    /health                    # Health check
```

**Dependencies:**
- MongoDB (primary replica)
- RabbitMQ
- Express.js
- bcryptjs (password hashing)

**Startup:** `pnpm --filter @sarkari/transaction-service dev`

**Port:** 3002

---

### 3. Admin Service

**Purpose:** Admin operations for content management, file uploads, and user administration.

**Location:** [services/admin-service](services/admin-service)

**Features:**
- Admin authentication required
- File upload to MinIO
- Product creation and management
- User management
- Settings management

**Endpoints:**
```
# All routes require admin authentication

POST   /api/admin/products        # Create product
PUT    /api/admin/products/:id    # Update product
DELETE /api/admin/products/:id    # Delete product

POST   /api/admin/upload          # Upload file to MinIO
DELETE /api/admin/files/:fileId   # Delete file

GET    /api/admin/users           # List users
PUT    /api/admin/users/:id       # Update user
DELETE /api/admin/users/:id       # Delete user

POST   /api/admin/settings        # Update settings
GET    /api/admin/settings        # Get settings

GET    /health                    # Health check
```

**Authentication:**
- JWT token validation
- Admin role verification
- Secure file handling

**Dependencies:**
- MongoDB (primary replica)
- MinIO
- Express.js
- Multer (file handling)

**Startup:** `pnpm --filter @sarkari/admin-service dev`

**Port:** 3003

---

### 4. Worker Service

**Purpose:** Background processing for emails, invoice generation, and cache invalidation.

**Location:** [services/worker-service](services/worker-service)

**Features:**
- Email notifications (order confirmations, user updates)
- PDF invoice generation
- Cache invalidation coordination
- Event-driven architecture via RabbitMQ

**Consumers:**
```
emailConsumer
  - Listens for email events
  - Sends transactional emails via Nodemailer
  - Handles failures gracefully

invoiceConsumer
  - Listens for invoice generation events
  - Creates PDF invoices with PDFKit
  - Stores files in MinIO

cacheConsumer
  - Listens for cache invalidation events
  - Clears Redis cache entries
  - Notifies read-service of updates
```

**Event Types:**
```json
{
  "event": "order.created",
  "data": { "orderId": "...", "userId": "...", "email": "..." }
}
{
  "event": "invoice.generate",
  "data": { "orderId": "...", "items": [...] }
}
{
  "event": "cache.invalidate",
  "data": { "keys": [...] }
}
```

**Dependencies:**
- RabbitMQ
- MongoDB (secondary replica)
- Redis
- Nodemailer
- PDFKit

**Startup:** `pnpm --filter @sarkari/worker-service dev`

**Port:** None (background service)

---

### 5. Frontend (Web App)

**Purpose:** Modern, responsive user interface for browsing products and managing orders.

**Location:** [apps/web](apps/web)

**Technology:**
- Next.js 14+ with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- TipTap (rich text editor)
- Framer Motion (animations)
- Radix UI (accessible components)

**Key Pages:**
```
/                       # Home page
/store                  # Product catalog
/store/[slug]           # Product details
/cart                   # Shopping cart
/checkout               # Checkout flow
/auth/login             # Login page
/auth/signup            # Registration page
/profile                # User profile
/dashboard              # User dashboard
/admin                  # Admin dashboard
/admin/products         # Product management
/admin/users            # User management
```

**Components Structure:**
```
components/
├── admin/               # Admin-specific components
├── auth/                # Authentication components
├── layout/              # Layout components (header, footer, navbar)
├── sections/            # Page section components
├── store/               # Store/catalog components
├── ui/                  # Base UI components (buttons, cards, modals)
└── ...
```

**Features:**
- Product search and filtering
- Dynamic cart management
- Secure checkout
- User authentication
- Admin panel for content management
- Responsive design for all devices
- Rich text editor for product descriptions

**Startup:** `pnpm --filter @sarkari/web dev`

**Port:** 3000

---

## 🏛️ Infrastructure

### MongoDB Replica Set

**Purpose:** Primary database with high availability and read scaling.

**Configuration:**
- **Primary:** Port 27017 (reads + writes)
- **Secondary:** Port 27018 (reads only)
- **Arbiter:** Port 27019 (no data, voting only)

**Initialization:**
```bash
# Manual initialization
docker exec mongo-primary mongosh --eval "
  rs.initiate({
    _id: 'rs0',
    members: [
      { _id: 0, host: 'mongo-primary:27017' },
      { _id: 1, host: 'mongo-secondary:27017' },
      { _id: 2, host: 'mongo-arbiter:27017', arbiterOnly: true }
    ]
  })
"
```

**Models:**
- User (authentication)
- Product (catalog)
- Order (transactions)
- Cart (sessions)
- Notification
- Settings

**Connection Strings:**
```javascript
// Primary (write operations)
mongodb://mongo-primary:27017/nvsbookstore?replicaSet=rs0

// Secondary (read operations)
mongodb://mongo-secondary:27017/nvsbookstore?replicaSet=rs0
```

### Redis Cache

**Purpose:** In-memory caching for improved read performance.

**Configuration:**
- **Host:** redis
- **Port:** 6379
- **Persistence:** RDB snapshots

**Usage:**
- Session storage
- Product cache
- Query result caching
- Rate limiting

**Cache Keys:**
```
products:*              # Product data
notifications:*         # Notification data
user:sessions:*         # Session data
search:*                # Search results
```

### MinIO Object Storage

**Purpose:** S3-compatible storage for file uploads and backups.

**Configuration:**
- **Endpoint:** localhost:9000
- **Console:** localhost:9001
- **Default Credentials:** minioadmin/minioadmin

**Buckets:**
```
products/               # Product images and PDFs
invoices/               # Generated invoices
uploads/                # User uploads
backups/                # Database backups
```

**Usage:**
```javascript
const Minio = require('minio');
const client = new Minio.Client({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin'
});
```

### RabbitMQ Message Broker

**Purpose:** Asynchronous message queue for decoupled services.

**Configuration:**
- **Host:** localhost
- **AMQP Port:** 5672
- **Management UI:** localhost:15672

**Default Credentials:** guest/guest

**Exchanges & Queues:**

```
Exchange: sarkari.events
  ├── sarkari.order.events
  │   └── Consumer: order-worker
  ├── sarkari.email.events
  │   └── Consumer: email-worker
  ├── sarkari.invoice.events
  │   └── Consumer: invoice-worker
  └── sarkari.cache.events
      └── Consumer: cache-invalidation-worker
```

### Nginx Reverse Proxy

**Purpose:** Route requests to appropriate services and load balancing.

**Location:** [infrastructure/nginx/nginx.conf](infrastructure/nginx/nginx.conf)

**Configuration:**
```nginx
upstream read_service {
  server read-service:3001;
}

upstream transaction_service {
  server transaction-service:3002;
}

upstream admin_service {
  server admin-service:3003;
}

server {
  listen 80;
  server_name localhost;

  location /api/products {
    proxy_pass http://read_service;
  }

  location /api/orders {
    proxy_pass http://transaction_service;
  }

  location /api/admin {
    proxy_pass http://admin_service;
  }
}
```

---

## 👨‍💻 Development

### Code Organization

The project follows a clean architecture pattern with clear separation of concerns:

```
Service/
├── src/
│   ├── controllers/      # Business logic and request handling
│   ├── routes/           # API route definitions
│   ├── models/           # Database schemas (if applicable)
│   ├── middleware/       # Express middleware
│   ├── utils/            # Helper functions
│   ├── services/         # Business logic layer
│   └── index.js          # Entry point
├── tests/                # Test files
├── Dockerfile            # Container configuration
└── package.json          # Dependencies
```

### Development Scripts

```bash
# Install dependencies across all packages
pnpm install

# Start all services in development mode
pnpm dev

# Build all services
pnpm build

# Run linting
pnpm lint

# Run tests
pnpm test

# Docker operations
pnpm docker:up           # Start all containers
pnpm docker:down         # Stop all containers
```

### Git Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -am "Add feature"`
3. Push to remote: `git push origin feature/your-feature`
4. Create a pull request
5. Wait for review and CI/CD checks
6. Merge to main branch

### Code Style

- **JavaScript/TypeScript:** Use ESLint configuration
- **Formatting:** Prettier (configured in ESLint)
- **Import organization:** Group imports logically
- **Error handling:** Always include try-catch or error middleware
- **Logging:** Use centralized logger from `@sarkari/logger`

### Debugging

**Enable debug mode:**
```bash
DEBUG=* pnpm dev
```

**MongoDB debugging:**
```bash
# Access MongoDB shell
docker exec -it mongo-primary mongosh

# View replica set status
rs.status()
```

**Redis debugging:**
```bash
docker exec -it redis redis-cli
```

**RabbitMQ debugging:**
```
Visit http://localhost:15672 (guest/guest)
```

---

## 🐳 Deployment

### Production Build

```bash
# Build all services
pnpm build

# Run production services
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables for Production

Create `.env.production`:
```env
NODE_ENV=production
LOG_LEVEL=info

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/nvsbookstore
MONGODB_SECONDARY_URI=mongodb+srv://user:password@cluster.mongodb.net/nvsbookstore

# Redis (managed service)
REDIS_URL=redis://managed-redis-host:6379

# RabbitMQ (managed service)
RABBITMQ_URL=amqp://user:password@managed-rabbitmq:5672

# MinIO (or AWS S3)
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_ACCESS_KEY=aws-access-key
MINIO_SECRET_KEY=aws-secret-key

# JWT
JWT_SECRET=your-production-secret

# Security
SESSION_SECRET=your-production-session-secret
CORS_ORIGIN=https://yourdomain.com
```

### Docker Deployment

**Build images:**
```bash
docker build -f Dockerfile.web -t nvsbookstore/web:latest apps/web
docker build -f Dockerfile.service -t nvsbookstore/read-service:latest services/read-service
docker build -f Dockerfile.service -t nvsbookstore/transaction-service:latest services/transaction-service
docker build -f Dockerfile.service -t nvsbookstore/admin-service:latest services/admin-service
docker build -f Dockerfile.service -t nvsbookstore/worker-service:latest services/worker-service
```

**Push to registry:**
```bash
docker tag nvsbookstore/web:latest youregistry/nvsbookstore/web:latest
docker push youregistry/nvsbookstore/web:latest
```

### Kubernetes Deployment

See individual service documentation and Helm charts for Kubernetes deployment configurations.

---

## 📊 Monitoring & Logging

### Centralized Logging

All services use the centralized logger from `@sarkari/logger`:

```javascript
const logger = require('@sarkari/logger');

logger.info('Operation completed', { userId: 123, action: 'purchase' });
logger.error('Database connection failed', error);
logger.debug('Cache hit', { key: 'products:123' });
```

### Health Checks

Each service provides a health endpoint:
```bash
GET http://localhost:3001/health
GET http://localhost:3002/health
GET http://localhost:3003/health
```

### Performance Monitoring

- Monitor MongoDB replica set lag
- Track Redis memory usage
- Monitor RabbitMQ queue depths
- Track API response times

---

## 🤝 Contributing

### Guidelines

1. Fork the repository
2. Create a feature branch
3. Follow code style guidelines
4. Add tests for new features
5. Submit a pull request with description

### Reporting Issues

- Use GitHub Issues
- Provide clear description and steps to reproduce
- Include error logs and screenshots

---

## 📝 License

[Add your license information here]

---

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Contact: support@nvsbookstore.com

---

**Last Updated:** February 2026  
**Maintained By:** Development Team
