# Admin Service Documentation

**Service Name:** Admin Service  
**Purpose:** Secure admin operations for content management and file uploads  
**Port:** 3003  
**Package:** `@sarkari/admin-service`  
**Authentication:** Required (JWT + Admin Role)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [File Upload](#file-upload)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Security](#security)
- [Deployment](#deployment)

---

## 🎯 Overview

The Admin Service provides secure, admin-only endpoints for managing the entire platform. All endpoints require:
1. Valid JWT token
2. Admin role verification
3. Additional request validation

### Key Responsibilities

1. **Product Management:** Create, update, delete products
2. **File Management:** Upload files to MinIO, manage file metadata
3. **User Management:** Manage user accounts and permissions
4. **Settings Management:** Platform configuration
5. **Migration Support:** Database migrations for setup

### Key Characteristics

- **Strict Authentication:** All endpoints require admin JWT
- **File Storage:** Integration with MinIO for secure file uploads
- **Primary Database:** MongoDB primary replica for writes
- **Logging:** Detailed audit logging of all admin actions
- **Error Handling:** Comprehensive error responses

---

## 🏗️ Architecture

### Service Flow

```
┌──────────────────────────────┐
│    Admin Request             │
│  (from Admin Dashboard)      │
└──────────────┬───────────────┘
               │
      ┌────────▼─────────────────┐
      │ JWT Validation           │
      │ (Token check)            │
      └────────┬─────────────────┘
               │
      ┌────────▼─────────────────┐
      │ Admin Authorization      │
      │ (Role verification)      │
      └────────┬─────────────────┘
               │
      ┌────────▼──────────────────────┐
      │  Express Router               │
      │  - Products routes            │
      │  - Files routes               │
      │  - Users routes               │
      │  - Settings routes            │
      └────────┬───────────────────────┘
               │
      ┌────────▼─────────────────────────┐
      │  Controllers                     │
      │  - productController             │
      │  - fileController                │
      │  - userController                │
      │  - settingsController            │
      └────────┬─────────────────────────┘
               │
    ┌──────────┴──────────────┐
    │                         │
┌───▼──────────────┐  ┌───────▼──────────┐
│ MongoDB Primary  │  │ MinIO Storage    │
│ - Store metadata │  │ - Upload files   │
│ - Store data     │  │ - Store images   │
│ - Audit logs     │  │ - Store PDFs     │
└──────────────────┘  └──────────────────┘
```

---

## 🔌 API Endpoints

### Product Management

#### Create Product

```http
POST /api/admin/products
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "The Lord of the Rings",
  "description": "Epic fantasy novel...",
  "price": 599.99,
  "category": "fantasy",
  "author": "J.R.R. Tolkien",
  "isbn": "978-0-547-92817-7",
  "image": "url-to-image",
  "rating": 4.9,
  "inStock": true,
  "stock": 100,
  "tags": ["fantasy", "adventure", "classic"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "...",
      "title": "The Lord of the Rings",
      "description": "...",
      "price": 599.99,
      "category": "fantasy",
      "createdAt": "2026-02-19T10:30:00Z"
    }
  }
}
```

---

#### Update Product

```http
PUT /api/admin/products/:productId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "The Lord of the Rings (Updated Edition)",
  "price": 499.99,
  "stock": 150
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "product": {...}
  }
}
```

**Audit Log:**
- Records: Product ID, changes, timestamp, admin ID

---

#### Delete Product

```http
DELETE /api/admin/products/:productId
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

#### Bulk Product Operations

```http
POST /api/admin/products/bulk-update
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "operations": [
    {
      "productId": "...",
      "action": "update",
      "data": { "stock": 100 }
    },
    {
      "productId": "...",
      "action": "delete"
    }
  ]
}
```

---

### File Management

#### Upload File

```http
POST /api/admin/upload
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

file: <binary>
bucket: products
metadata: {"productId": "...", "type": "cover"}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "file": {
      "fileId": "...",
      "filename": "book-cover.jpg",
      "size": 245632,
      "bucket": "products",
      "url": "https://minio.example.com/products/...",
      "uploadedAt": "2026-02-19T10:30:00Z"
    }
  }
}
```

---

#### Get File Metadata

```http
GET /api/admin/files/:fileId
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "file": {
      "fileId": "...",
      "filename": "book-cover.jpg",
      "size": 245632,
      "bucket": "products",
      "url": "...",
      "uploadedAt": "2026-02-19T10:30:00Z",
      "uploadedBy": "...",
      "metadata": {...}
    }
  }
}
```

---

#### List Files

```http
GET /api/admin/files?bucket=products&limit=20&page=1
Authorization: Bearer <admin_token>
```

**Query Parameters:**
```
bucket=products             # MinIO bucket name
limit=20                    # Items per page
page=1                      # Page number
search=book                 # Search filename
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "files": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150
    }
  }
}
```

---

#### Delete File

```http
DELETE /api/admin/files/:fileId
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

### User Management

#### List Users

```http
GET /api/admin/users?role=user&limit=20&page=1
Authorization: Bearer <admin_token>
```

**Query Parameters:**
```
role=user                   # Filter by role
status=active               # Filter by status
search=email@example.com    # Search by email/name
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "...",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "user",
        "status": "active",
        "createdAt": "2026-01-15T10:00:00Z",
        "lastLogin": "2026-02-19T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 250
    }
  }
}
```

---

#### Get User Details

```http
GET /api/admin/users/:userId
Authorization: Bearer <admin_token>
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
      "status": "active",
      "avatar": "url",
      "phone": "+1234567890",
      "address": {...},
      "createdAt": "2026-01-15T10:00:00Z",
      "orders": 15,
      "totalSpent": 15000
    }
  }
}
```

---

#### Update User

```http
PUT /api/admin/users/:userId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "moderator",
  "status": "active",
  "firstName": "John",
  "lastName": "Smith"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {...}
  }
}
```

---

#### Delete User

```http
DELETE /api/admin/users/:userId
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

#### Send User Email

```http
POST /api/admin/users/:userId/send-email
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "subject": "Account Security Alert",
  "template": "security-alert",
  "data": {}
}
```

---

### Settings Management

#### Get Settings

```http
GET /api/admin/settings
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "settings": {
      "storeName": "NVS Bookstore",
      "storeEmail": "support@nvsbookstore.com",
      "storePhone": "+1234567890",
      "currency": "USD",
      "timezone": "America/New_York",
      "features": {
        "orders": true,
        "payments": true,
        "newsletter": true
      },
      "limits": {
        "maxUploadSize": 52428800,
        "maxProducts": 50000
      }
    }
  }
}
```

---

#### Update Settings

```http
PUT /api/admin/settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "storeName": "NVS Bookstore Premium",
  "currency": "INR",
  "features": {
    "orders": true,
    "payments": true,
    "newsletter": false
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "settings": {...}
  }
}
```

---

### Migration Endpoint

#### Run Database Migration

```http
POST /api/migrate
Content-Type: application/json

{
  "version": "1.0.0"
}
```

**Note:** This endpoint is publicly accessible for initial setup only (temporary)

**Response (200):**
```json
{
  "success": true,
  "message": "Migration completed successfully",
  "data": {
    "collectionsCreated": 5,
    "indexesCreated": 12
  }
}
```

---

### Health Check

```http
GET /health
```

**Response (200):**
```json
{
  "status": "ok",
  "service": "admin-service",
  "mongodb": "connected",
  "minio": "connected"
}
```

---

## 📤 File Upload

### Upload Process

```
1. Client selects file
   ↓
2. Frontend sends to /api/admin/upload
   ↓
3. Multer validates file
   - Check size (max 50MB)
   - Check MIME type
   - Scan for malware
   ↓
4. Upload to MinIO bucket
   ↓
5. Create file metadata in MongoDB
   ↓
6. Return file URL
```

### Supported File Types

```javascript
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/csv': ['.csv']
};
```

### MinIO Buckets

```
products/                    # Product images and PDFs
invoices/                    # Generated invoices (from Worker Service)
uploads/                     # General uploads
backups/                     # Database backups
```

### File Metadata

```javascript
{
  fileId: ObjectId,
  filename: String,
  originalName: String,
  mimetype: String,
  size: Number,
  bucket: String,
  key: String,              // MinIO object key
  url: String,              // Public URL
  uploadedBy: ObjectId,     // Admin user ID
  uploadedAt: Date,
  expiresAt: Date,          // Optional expiry
  metadata: {
    productId: ObjectId,
    type: String
  }
}
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 7+ (primary replica)
- MinIO latest
- pnpm 10.30.0+

### Installation

```bash
# From root directory
pnpm install

# Navigate to service
cd services/admin-service
pnpm install
```

### Configuration

Create `.env` file:

```env
NODE_ENV=development
PORT=3003
LOG_LEVEL=debug

# MongoDB
MONGODB_URI=mongodb://localhost:27017/nvsbookstore?replicaSet=rs0

# JWT
JWT_SECRET=your-super-secret-jwt-key

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false

# File Upload
MAX_FILE_SIZE=52428800          # 50MB
ALLOWED_MIME_TYPES=image/jpeg,image/png,application/pdf

# Service
SERVICE_NAME=admin-service
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
curl http://localhost:3003/health
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3003 | Service port |
| `MONGODB_URI` | - | MongoDB primary connection |
| `JWT_SECRET` | - | JWT signing key |
| `MINIO_ENDPOINT` | - | MinIO server endpoint |
| `MINIO_ACCESS_KEY` | - | MinIO access key |
| `MINIO_SECRET_KEY` | - | MinIO secret key |
| `MINIO_USE_SSL` | false | Use HTTPS for MinIO |
| `MAX_FILE_SIZE` | 52428800 | Maximum upload size (bytes) |

### Authentication Middleware

```javascript
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

---

## 📊 Database Schema

### File Collection

```javascript
{
  _id: ObjectId,
  filename: String,
  originalName: String,
  mimetype: String,
  size: Number,
  bucket: String,
  key: String,              // MinIO object key
  url: String,
  uploadedBy: ObjectId,     // Reference to User
  uploadedAt: Date,
  expiresAt: Date,
  metadata: {
    productId: ObjectId,
    type: String,
    description: String
  },
  deleted: Boolean,
  deletedAt: Date
}
```

### Audit Log Collection

```javascript
{
  _id: ObjectId,
  adminId: ObjectId,        // Reference to User
  action: String,           // 'create', 'update', 'delete'
  resource: String,         // 'product', 'user', 'file'
  resourceId: ObjectId,
  changes: {
    before: Object,
    after: Object
  },
  status: String,           // 'success', 'failed'
  ipAddress: String,
  userAgent: String,
  timestamp: Date
}
```

### Settings Collection

```javascript
{
  _id: ObjectId,
  storeName: String,
  storeEmail: String,
  storePhone: String,
  currency: String,
  timezone: String,
  features: {
    orders: Boolean,
    payments: Boolean,
    newsletter: Boolean
  },
  limits: {
    maxUploadSize: Number,
    maxProducts: Number,
    maxUsers: Number
  },
  updatedAt: Date,
  updatedBy: ObjectId
}
```

---

## 🔒 Security

### Input Validation

```javascript
// Example: Product validation
const { body, validationResult } = require('express-validator');

const validateProduct = [
  body('title').trim().notEmpty().isLength({ min: 3, max: 200 }),
  body('price').isFloat({ min: 0 }).toFloat(),
  body('stock').isInt({ min: 0 }).toInt(),
  body('category').trim().notEmpty(),
  body('description').trim().notEmpty()
];

router.post('/products', validateProduct, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process...
});
```

### File Upload Security

```javascript
const multer = require('multer');

const upload = multer({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE)
  },
  fileFilter: (req, file, cb) => {
    // Validate MIME type
    const allowedTypes = process.env.ALLOWED_MIME_TYPES.split(',');
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  }
});
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                  // Max requests
  keyGenerator: (req) => req.user?.id
});

router.use(adminLimiter);
```

### CORS Configuration

```javascript
app.use(cors({
  origin: process.env.ADMIN_FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 🚀 Deployment

### Docker

```bash
docker build -f Dockerfile.service -t admin-service:latest .
docker run -p 3003:3003 \
  -e MONGODB_URI=mongodb://... \
  -e MINIO_ENDPOINT=... \
  -e JWT_SECRET=... \
  admin-service:latest
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-service
spec:
  replicas: 1  # Single instance for data consistency
  selector:
    matchLabels:
      app: admin-service
  template:
    metadata:
      labels:
        app: admin-service
    spec:
      containers:
      - name: admin-service
        image: admin-service:latest
        ports:
        - containerPort: 3003
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-creds
              key: uri
        - name: MINIO_ENDPOINT
          value: "minio:9000"
        livenessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 10
          periodSeconds: 30
```

---

## 🔍 Monitoring & Debugging

### Audit Logging

All admin actions are logged:
```javascript
await AuditLog.create({
  adminId: req.user._id,
  action: 'update',
  resource: 'product',
  resourceId: productId,
  changes: { before, after },
  timestamp: new Date()
});
```

### Debug Mode

```bash
DEBUG=admin-service* pnpm dev
```

### Common Issues

**Issue:** File upload fails
- Check MinIO connection
- Verify bucket exists
- Check file size limit

**Issue:** Admin authorization fails
- Verify JWT token has admin role
- Check token expiration

**Issue:** MongoDB connection fails
- Check connection string
- Verify MongoDB is running
- Check replica set status

---

**Last Updated:** February 2026
