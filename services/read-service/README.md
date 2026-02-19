# Read Service Documentation

**Service Name:** Read Service  
**Purpose:** High-performance, cache-optimized read operations  
**Port:** 3001  
**Package:** `@sarkari/read-service`

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Caching Strategy](#caching-strategy)
- [Deployment](#deployment)

---

## 🎯 Overview

The Read Service is optimized for high-traffic read scenarios. It queries the MongoDB secondary replica for read operations and caches results in Redis for subsequent requests. This architecture ensures:

- **High Performance:** Redis in-memory caching for sub-millisecond responses
- **Scalability:** Queries secondary replica to avoid impacting primary writes
- **Consistency:** Cache invalidation mechanism for data freshness
- **Reliability:** Fallback to database on cache misses

### Key Responsibilities

1. Product catalog browsing and search
2. Notification retrieval and filtering
3. Tag management and retrieval
4. Cache management for read-heavy operations
5. Support for pagination and filtering

---

## 🏗️ Architecture

### Service Architecture

```
┌─────────────────────────────────────────┐
│         Incoming Requests               │
│  (from Web Frontend or API Gateway)     │
└──────────────────┬──────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  Express Router    │
         │  - Route matching  │
         │  - Middleware      │
         └─────────┬──────────┘
                   │
         ┌─────────▼──────────────────────┐
         │  Controllers                   │
         │  - productController           │
         │  - notificationController      │
         │  - tagController               │
         └─────────┬──────────────────────┘
                   │
    ┌──────────────┴──────────────────┐
    │                                 │
┌───▼────────────┐         ┌─────────▼──────┐
│ Redis Cache    │         │ MongoDB        │
│ (Cache Hits)   │         │ Secondary      │
│ - Products     │         │ (Cache Miss)   │
│ - Notif. data  │         │ - Query data   │
│ - Search res.  │         │ - Store result │
└────────────────┘         └────────────────┘
```

### Data Flow

1. **Request arrives** → Express router handles it
2. **Cache lookup** → Check Redis for data
3. **Cache hit** → Return cached data immediately
4. **Cache miss** → Query MongoDB secondary
5. **Store in cache** → Set TTL (Time to Live)
6. **Return response** → Send data to client

### Cache Invalidation Flow

```
┌──────────────────────────────────┐
│  Admin Service (Write Operation) │
│  (e.g., product updated)         │
└────────────────┬─────────────────┘
                 │
                 ▼
    ┌─────────────────────────┐
    │  Publish Cache Events   │
    │  to RabbitMQ            │
    └────────────┬────────────┘
                 │
         ┌───────┴───────┐
         │               │
    ┌────▼─────┐    ┌────▼─────┐
    │ Worker   │    │ Read      │
    │ Service  │    │ Service   │
    │ (logs)   │    │ (invalidate)
    └──────────┘    └────┬─────┘
                         │
                    ┌────▼────────┐
                    │ Redis Delete │
                    │ Cache Keys   │
                    └─────────────┘
```

---

## 🔌 API Endpoints

### Products

#### Get All Products

```http
GET /api/products
```

**Query Parameters:**
```
page=1                      # Page number (default: 1)
limit=20                    # Items per page (default: 20)
category=fiction            # Filter by category
sort=newest                 # Sort by: newest, price_low, price_high
search=harry                # Search term
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "...",
        "title": "Book Title",
        "description": "...",
        "price": 299.99,
        "category": "fiction",
        "image": "url",
        "rating": 4.5,
        "reviews": 120,
        "inStock": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500
    }
  }
}
```

**Cache:**
- Key: `products:page:1:limit:20:category:fiction`
- TTL: 3600 seconds (1 hour)

---

#### Get Product by ID

```http
GET /api/products/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "Book Title",
    "description": "...",
    "price": 299.99,
    "category": "fiction",
    "author": "Author Name",
    "isbn": "978-3-16-148410-0",
    "image": "url",
    "rating": 4.5,
    "reviews": 120,
    "inStock": true,
    "stock": 50,
    "relatedProducts": [...]
  }
}
```

**Cache:**
- Key: `products:id:${id}`
- TTL: 7200 seconds (2 hours)

---

#### Search Products

```http
GET /api/products/search?q=query
```

**Query Parameters:**
```
q=harry                     # Search query (title, author, ISBN)
category=fiction            # Optional category filter
minPrice=100                # Minimum price
maxPrice=1000               # Maximum price
rating=4                    # Minimum rating
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [...],
    "count": 25,
    "searchTerm": "harry"
  }
}
```

**Cache:**
- Key: `search:${q}:${filters}`
- TTL: 1800 seconds (30 minutes)

---

### Notifications

#### Get Notifications

```http
GET /api/notifications
```

**Query Parameters:**
```
type=order                  # notification type
status=unread               # read or unread
limit=10
page=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "...",
        "userId": "...",
        "type": "order",
        "title": "Order Shipped",
        "message": "Your order has been shipped",
        "read": false,
        "createdAt": "2026-02-19T10:30:00Z"
      }
    ],
    "unreadCount": 5
  }
}
```

**Cache:**
- Key: `notifications:user:${userId}`
- TTL: 600 seconds (10 minutes)

---

#### Mark Notification as Read

```http
PUT /api/notifications/:id/read
```

**Note:** This endpoint triggers cache invalidation via RabbitMQ.

---

### Tags

#### Get All Tags

```http
GET /api/tags
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "_id": "...",
        "name": "fiction",
        "slug": "fiction",
        "description": "...",
        "count": 250
      }
    ]
  }
}
```

**Cache:**
- Key: `tags:all`
- TTL: 86400 seconds (24 hours)

---

#### Get Tag Details

```http
GET /api/tags/:slug
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "fiction",
    "slug": "fiction",
    "description": "...",
    "productCount": 250,
    "products": [...]
  }
}
```

**Cache:**
- Key: `tags:${slug}`
- TTL: 86400 seconds (24 hours)

---

### Cache Management

#### Invalidate Cache

```http
POST /api/cache/invalidate
```

**Authentication:** Internal service only (no auth required from internal network)

**Request Body:**
```json
{
  "keys": ["products:*", "tags:all", "search:*"],
  "pattern": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cache invalidated",
  "keysInvalidated": 15
}
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
  "service": "read-service",
  "uptime": 1234567,
  "redis": "connected",
  "mongodb": "connected"
}
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Redis 7+
- MongoDB 7+ (secondary replica)
- pnpm 10.30.0+

### Installation

```bash
# Install dependencies
pnpm install

# From root directory
cd services/read-service
pnpm install
```

### Configuration

Create `.env` file:

```env
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

# MongoDB
MONGODB_SECONDARY_URI=mongodb://localhost:27018/nvsbookstore?replicaSet=rs0

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600

# Service
SERVICE_NAME=read-service
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
# Check health
curl http://localhost:3001/health

# Get products
curl http://localhost:3001/api/products
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Service port |
| `NODE_ENV` | development | Environment |
| `LOG_LEVEL` | info | Logging level |
| `MONGODB_SECONDARY_URI` | - | MongoDB secondary connection |
| `REDIS_URL` | redis://localhost:6379 | Redis connection |
| `REDIS_TTL` | 3600 | Default cache TTL (seconds) |
| `REDIS_KEY_PREFIX` | read-service | Redis key prefix |

### Redis Configuration

```javascript
// Default cache TTL by data type
const cacheTTL = {
  products: 3600,        // 1 hour
  notifications: 600,    // 10 minutes
  tags: 86400,          // 24 hours
  search: 1800          // 30 minutes
};
```

### MongoDB Configuration

```javascript
// Connection options
const options = {
  readPreference: 'secondary',  // Always use secondary
  maxPoolSize: 50,
  socketTimeoutMS: 45000
};
```

---

## 📊 Database Schema

### Products Collection

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  price: Number,
  category: String,
  author: String,
  isbn: String,
  image: String,
  rating: Number,      // 0-5
  reviews: Number,
  inStock: Boolean,
  stock: Number,
  createdAt: Date,
  updatedAt: Date,
  tags: [String]
}
```

### Notifications Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  type: String,        // 'order', 'product', 'system'
  title: String,
  message: String,
  read: Boolean,
  data: Object,        // Type-specific data
  createdAt: Date
}
```

### Tags Collection

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,        // URL-friendly
  description: String,
  createdAt: Date
}
```

---

## 💾 Caching Strategy

### Cache Keys

```
products:page:{page}:limit:{limit}:category:{category}
products:id:{productId}
search:{query}:{filters}
notifications:user:{userId}
tags:all
tags:{slug}
```

### TTL Strategy

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Products | 1 hour | Moderate change frequency |
| Product Details | 2 hours | Detailed views rarely change |
| Search Results | 30 min | Query-specific, frequent invalidation |
| Notifications | 10 min | High update frequency |
| Tags | 24 hours | Rarely change |

### Cache Invalidation

**Event-Based:**
```javascript
// When admin updates product
rabbitmq.publish('sarkari.cache.events', {
  event: 'product.updated',
  data: { productId: '...' }
});

// Read Service consumer
cache.del(`products:id:${productId}`);
cache.del('products:page:*');  // Pattern delete
```

**Time-Based:**
- Automatic expiration via TTL
- Redis key expiration

**Manual:**
- POST `/api/cache/invalidate` endpoint

---

## 📈 Performance

### Response Times

- **Cache Hit:** ~5ms
- **Cache Miss (MongoDB Query):** ~50-100ms
- **Search Operation:** ~100-200ms

### Optimization Tips

1. **Connection Pooling:** MongoDB and Redis are connection pooled
2. **Query Optimization:** Indexes on frequently queried fields
3. **Pagination:** Always paginate results (default 20 per page)
4. **Compression:** Enable GZIP compression in production
5. **CDN:** Cache static assets with CDN

---

## 🚀 Deployment

### Docker

Build and run:
```bash
docker build -t read-service:latest .
docker run -p 3001:3001 \
  -e MONGODB_SECONDARY_URI=mongodb://... \
  -e REDIS_URL=redis://... \
  read-service:latest
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: read-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: read-service
  template:
    metadata:
      labels:
        app: read-service
    spec:
      containers:
      - name: read-service
        image: read-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: MONGODB_SECONDARY_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-creds
              key: secondary-uri
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-creds
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 30
```

### Scaling

- **Horizontal:** Deploy multiple Read Service instances behind load balancer
- **Redis Cluster:** Use Redis Cluster for distributed caching
- **MongoDB Secondary Replicas:** Add more secondary replicas

---

## 🔍 Monitoring & Debugging

### Health Checks

```bash
curl http://localhost:3001/health
```

### Logs

```bash
# View logs in development
DEBUG=read-service* pnpm dev

# Production logs
tail -f logs/read-service.log
```

### Common Issues

**Issue:** Cache misses increasing
- **Cause:** TTL too short or cache key mismatch
- **Solution:** Increase TTL or check key generation logic

**Issue:** High MongoDB query times
- **Cause:** Missing indexes or heavy query
- **Solution:** Add indexes to frequently queried fields

**Issue:** Redis connection errors
- **Cause:** Network or Redis down
- **Solution:** Check Redis status and network connectivity

---

## 📞 Support

For issues or questions:
- Check logs: `DEBUG=* npm run dev`
- Verify Redis connection: `redis-cli ping`
- Check MongoDB: `mongosh --eval "db.serverStatus()"`

**Last Updated:** February 2026
