# Transaction Service Documentation

**Service Name:** Transaction Service  
**Purpose:** Critical operations for authentication, payments, orders, and cart management  
**Port:** 3002  
**Package:** `@sarkari/transaction-service`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Events & Messages](#events--messages)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Security](#security)
- [Deployment](#deployment)

---

## 🎯 Overview

The Transaction Service handles all critical business operations that require strong consistency and reliability. It manages:

- **User Authentication:** Signup, login, OAuth integration
- **Order Management:** Order creation, tracking, and status updates
- **Cart Operations:** Add/remove items, cart updates
- **Payment Processing:** Integration ready for payment gateways
- **Print Orders:** Special order type for print materials

This service connects to the primary MongoDB replica for write operations and publishes events to RabbitMQ for asynchronous processing.

### Key Characteristics

- **Primary Database:** MongoDB primary replica (all write operations)
- **Message Queue:** RabbitMQ for async tasks
- **Authentication:** JWT-based token authentication
- **Security:** bcryptjs password hashing, CORS protection
- **Reliability:** Transaction support, error handling

---

## 🏗️ Architecture

### Service Flow

```
┌──────────────────────────────┐
│    Client Request            │
│  (from Web Frontend)         │
└──────────────┬───────────────┘
               │
      ┌────────▼─────────┐
      │ Authentication   │
      │ Middleware       │
      │ (JWT validation) │
      └────────┬─────────┘
               │
      ┌────────▼──────────────────┐
      │  Express Router           │
      │  - Auth routes            │
      │  - Order routes           │
      │  - Cart routes            │
      └────────┬──────────────────┘
               │
      ┌────────▼─────────────────────┐
      │  Controllers                 │
      │  - authController            │
      │  - orderController           │
      │  - cartController            │
      └────────┬─────────────────────┘
               │
   ┌───────────┴──────────────┐
   │                          │
┌──▼───────────┐     ┌────────▼──────────┐
│ MongoDB      │     │ RabbitMQ          │
│ Primary      │     │ Message Broker    │
│ - Store data │     │ - Publish events  │
│ - Queries    │     │ - Email queue     │
│ - Write ops  │     │ - Invoice queue   │
└──────────────┘     │ - Cache queue     │
                     └───────────────────┘
```

### Request/Response Cycle

1. **Request Validation** → Verify input data
2. **Authentication** → Check JWT token (if required)
3. **Authorization** → Check user roles/permissions
4. **Business Logic** → Process request
5. **Database Operation** → Save/update in MongoDB
6. **Event Publishing** → Publish to RabbitMQ
7. **Response** → Send result to client

---

## 🔐 Authentication

### JWT Token Structure

```javascript
{
  header: {
    alg: "HS256",
    typ: "JWT"
  },
  payload: {
    userId: "...",
    email: "user@example.com",
    role: "user",
    iat: 1708369200,
    exp: 1708455600  // 24 hours
  },
  signature: "..."
}
```

### Authentication Flow

#### Signup

```
User Input
  ↓
Validate Input (email, password)
  ↓
Check Email Exists
  ↓
Hash Password (bcryptjs)
  ↓
Create User in MongoDB
  ↓
Generate JWT Token
  ↓
Return Token + User Data
```

#### Login

```
Email + Password
  ↓
Find User
  ↓
Compare Password (bcryptjs)
  ↓
Generate JWT Token
  ↓
Return Token + User Data
```

#### Google OAuth

```
Google ID Token
  ↓
Verify with Google
  ↓
Check User Exists
  ↓
Create/Update User
  ↓
Generate JWT Token
  ↓
Return Token
```

### Token Refresh

```
Expired Token + Refresh Token
  ↓
Validate Refresh Token
  ↓
Generate New Access Token
  ↓
Return New Token
```

---

## 🔌 API Endpoints

### Authentication Endpoints

#### Signup (Register)

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Email already registered"
}
```

---

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400
  }
}
```

---

#### Google OAuth Login

```http
POST /api/auth/google
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response (200/201):**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "...",
    "isNewUser": false
  }
}
```

---

#### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400
  }
}
```

---

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "avatar": "url",
      "createdAt": "2026-02-19T10:00:00Z"
    }
  }
}
```

---

### Order Endpoints

#### Create Order

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "...",
      "quantity": 2,
      "price": 299.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "paymentMethod": "credit_card"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "...",
      "userId": "...",
      "items": [...],
      "total": 599.98,
      "status": "pending",
      "shippingAddress": {...},
      "createdAt": "2026-02-19T10:30:00Z"
    }
  }
}
```

**Events Published:**
- `order.created` → Email confirmation
- `invoice.generate` → Invoice PDF creation
- `cache.invalidate` → Cache update

---

#### Get Order

```http
GET /api/orders/:orderId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "...",
      "userId": "...",
      "items": [...],
      "total": 599.98,
      "status": "shipped",
      "trackingNumber": "...",
      "shippingAddress": {...},
      "createdAt": "2026-02-19T10:30:00Z",
      "updatedAt": "2026-02-19T12:00:00Z"
    }
  }
}
```

---

#### List User Orders

```http
GET /api/orders?page=1&limit=10&status=completed
Authorization: Bearer <token>
```

**Query Parameters:**
```
page=1                    # Page number
limit=10                  # Items per page
status=pending            # Filter by status
sortBy=createdAt          # Sort field
sortOrder=desc            # Sort order
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25
    }
  }
}
```

---

#### Update Order Status

```http
PUT /api/orders/:orderId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "shipped",
  "trackingNumber": "TRACK123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {...}
  }
}
```

---

#### Cancel Order

```http
DELETE /api/orders/:orderId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order cancelled"
}
```

---

### Cart Endpoints

#### Get Cart

```http
GET /api/cart
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cart": {
      "_id": "...",
      "userId": "...",
      "items": [
        {
          "_id": "...",
          "productId": "...",
          "quantity": 2,
          "price": 299.99,
          "addedAt": "2026-02-19T10:00:00Z"
        }
      ],
      "total": 599.98,
      "itemCount": 2
    }
  }
}
```

---

#### Add to Cart

```http
POST /api/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "...",
  "quantity": 2
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "cart": {...},
    "message": "Item added to cart"
  }
}
```

---

#### Update Cart Item

```http
PUT /api/cart/items/:itemId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cart": {...}
  }
}
```

---

#### Remove from Cart

```http
DELETE /api/cart/items/:itemId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cart": {...}
  }
}
```

---

#### Clear Cart

```http
DELETE /api/cart
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Cart cleared"
}
```

---

### Print Order Endpoints

#### Create Print Order

```http
POST /api/print-orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "<html>Print content</html>",
  "title": "Book Print",
  "pages": 300,
  "bindingType": "hardcover",
  "quantity": 10,
  "shippingAddress": {...}
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "printOrder": {
      "_id": "...",
      "userId": "...",
      "title": "Book Print",
      "pages": 300,
      "bindingType": "hardcover",
      "quantity": 10,
      "total": 5000,
      "status": "pending"
    }
  }
}
```

---

#### Get Print Order

```http
GET /api/print-orders/:printOrderId
Authorization: Bearer <token>
```

---

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "transaction-service",
  "mongodb": "connected",
  "rabbitmq": "connected"
}
```

---

## 📨 Events & Messages

### Published Events

Events published to RabbitMQ for Worker Service consumption:

#### 1. Order Created Event

```javascript
{
  event: 'order.created',
  timestamp: '2026-02-19T10:30:00Z',
  data: {
    orderId: '...',
    userId: '...',
    userEmail: 'user@example.com',
    items: [...],
    total: 599.98,
    shippingAddress: {...}
  }
}
```

**Worker Action:** Send order confirmation email

---

#### 2. Invoice Generation Event

```javascript
{
  event: 'invoice.generate',
  timestamp: '2026-02-19T10:30:05Z',
  data: {
    orderId: '...',
    userId: '...',
    items: [...],
    total: 599.98,
    invoiceNumber: 'INV-2026-001234'
  }
}
```

**Worker Action:** Generate PDF invoice and store in MinIO

---

#### 3. Cache Invalidation Event

```javascript
{
  event: 'cache.invalidate',
  timestamp: '2026-02-19T10:30:10Z',
  data: {
    keys: ['products:*', 'tags:all'],
    pattern: true
  }
}
```

**Worker Action:** Invalidate Redis cache in Read Service

---

### RabbitMQ Configuration

```javascript
const EXCHANGES = {
  main: 'sarkari.events'
};

const QUEUES = {
  orders: 'sarkari.order.events',
  emails: 'sarkari.email.events',
  invoices: 'sarkari.invoice.events',
  cache: 'sarkari.cache.events'
};
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 7+ (primary replica)
- RabbitMQ 3.12+
- pnpm 10.30.0+

### Installation

```bash
# From root directory
pnpm install

# Navigate to service
cd services/transaction-service
pnpm install
```

### Configuration

Create `.env` file:

```env
NODE_ENV=development
PORT=3002
LOG_LEVEL=debug

# MongoDB
MONGODB_URI=mongodb://localhost:27017/nvsbookstore?replicaSet=rs0

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=86400

# Session
SESSION_SECRET=your-session-secret

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
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
# Health check
curl http://localhost:3002/health

# Signup
curl -X POST http://localhost:3002/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!","firstName":"John"}'
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3002 | Service port |
| `MONGODB_URI` | - | MongoDB primary connection |
| `RABBITMQ_URL` | - | RabbitMQ connection |
| `JWT_SECRET` | - | JWT signing key |
| `JWT_EXPIRY` | 86400 | Token expiry (seconds) |
| `SESSION_SECRET` | - | Session secret |
| `BCRYPT_ROUNDS` | 10 | Password hash rounds |

### Database Connection

```javascript
// Primary replica connection
mongoose.connect(process.env.MONGODB_URI, {
  readPreference: 'primary',  // Write to primary only
  maxPoolSize: 50
});
```

---

## 📊 Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  email: String,                    // Unique
  password: String,                 // Hashed with bcryptjs
  firstName: String,
  lastName: String,
  avatar: String,
  role: String,                     // 'user' or 'admin'
  googleId: String,                 // For OAuth
  emailVerified: Boolean,
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  preferences: {
    newsletter: Boolean,
    notifications: Boolean
  },
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}
```

### Order Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  items: [
    {
      productId: ObjectId,
      quantity: Number,
      price: Number,
      title: String
    }
  ],
  total: Number,
  status: String,                   // 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  paymentMethod: String,
  trackingNumber: String,
  notes: String,
  createdAt: Date,
  updatedAt: Date,
  deliveredAt: Date
}
```

### Cart Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  items: [
    {
      productId: ObjectId,
      quantity: Number,
      price: Number,
      addedAt: Date
    }
  ],
  expiresAt: Date,                  // Cart expiry for cleanup
  createdAt: Date,
  updatedAt: Date
}
```

### Print Order Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  title: String,
  content: String,                  // HTML/markdown content
  pages: Number,
  bindingType: String,              // 'paperback', 'hardcover', 'spiral'
  quantity: Number,
  total: Number,
  status: String,                   // 'pending', 'processing', 'ready', 'shipped'
  shippingAddress: Object,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔒 Security

### Password Security

```javascript
// Hashing
const hashedPassword = await bcrypt.hash(plainPassword, 10);

// Verification
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

### JWT Security

```javascript
// Token generation
const token = jwt.sign(
  { userId, email, role },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Verification
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

### CORS Configuration

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Rate Limiting

```javascript
// Implement rate limiting on auth endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5                      // 5 attempts
});

app.post('/api/auth/login', limiter, authController.login);
```

---

## 🚀 Deployment

### Docker

```bash
docker build -f Dockerfile.service -t transaction-service:latest .
docker run -p 3002:3002 \
  -e MONGODB_URI=mongodb://... \
  -e RABBITMQ_URL=amqp://... \
  -e JWT_SECRET=... \
  transaction-service:latest
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: transaction-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: transaction-service
  template:
    metadata:
      labels:
        app: transaction-service
    spec:
      containers:
      - name: transaction-service
        image: transaction-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-creds
              key: uri
        - name: RABBITMQ_URL
          valueFrom:
            secretKeyRef:
              name: rabbitmq-creds
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 10
          periodSeconds: 30
```

---

## 🔍 Monitoring & Debugging

### Logging

```bash
# Development with debug
DEBUG=transaction-service* pnpm dev

# Production logs
tail -f logs/transaction-service.log
```

### Common Issues

**Issue:** JWT token invalid
- Check `JWT_SECRET` is consistent
- Verify token expiry

**Issue:** Order creation fails
- Check MongoDB connection
- Verify RabbitMQ is running

**Issue:** Email not sending
- Check Worker Service logs
- Verify RabbitMQ messages

---

**Last Updated:** February 2026
