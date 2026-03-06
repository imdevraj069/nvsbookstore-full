# File Storage Schema Fixes

## Issues Fixed

### Problem
Product validation was failing with errors:
```
digitalFile.fileName: Cast to string failed for value "{ fileName: '...', path: '...', ... }" (type Object)
thumbnail.url: Path `url` is required
```

### Root Cause
The controllers were storing the entire object returned from `uploadImage()` and `uploadDocument()` functions, but the MongoDB schemas expected specific fields:
- **Product.thumbnail** and **Product.images**: Expected `mediaSchema` with fields: `url`, `key`, `bucket`, `mimeType`, `altText`, `sortOrder`
- **Product.digitalFile**: Expected fields: `key`, `bucket`, `fileName`, `fileSize`
- **Notification.pdfFile**: Expected fields: `key`, `bucket`, `fileName`, `fileSize`

## Changes Made

### 1. Updated Product Controller (`productController.js`)

#### Create Product
Changed from storing entire upload result:
```javascript
// BEFORE (incorrect)
const fileName = await uploadImage(...);
data.thumbnail = {
  fileName: fileName,
  path: `/api/admin/images/serve/${fileName}`,
  type: 'image',
  mimeType: file.mimetype,
};
```

To extracting only required fields:
```javascript
// AFTER (correct)
const uploadResult = await uploadImage(...);
data.thumbnail = {
  url: uploadResult.path,
  key: uploadResult.fileName,
  bucket: 'local-storage',
  mimeType: file.mimetype,
  altText: '',
};
```

#### Update Product
- Changed references from `thumbnail.fileName` to `thumbnail.key`
- Changed references from `image.fileName` to `image.key`
- Changed references from `digitalFile.fileName` to `digitalFile.key` (for deletion)

### 2. Updated Notification Controller (`notificationController.js`)

#### Create Notification
```javascript
// BEFORE
const fileName = await uploadDocument(...);
data.pdfFile = {
  fileName: fileName,
  path: `/api/admin/documents/serve/${fileName}`,
  type: 'document',
  fileSize: file.size,
};

// AFTER
const uploadResult = await uploadDocument(...);
data.pdfFile = {
  key: uploadResult.fileName,
  bucket: 'local-storage',
  fileName: uploadResult.fileName,
  fileSize: file.size,
};
```

#### Update Notification
- Changed from `pdfFile.fileName` to `pdfFile.key` for file deletion

#### Delete Notification
- Updated file cleanup to use `pdfFile.key` instead of `pdfFile.fileName`

## Storage Structure

All files are stored in the filesystem at:
```
~/storage/
├── images/        # Product thumbnails and gallery images
├── documents/     # Product digital files and notification PDFs
└── backups/       # System backups
```

### Environment Variables
- `IMAGES_DIR`: Path to images directory (default: ~/storage/images)
- `DOCUMENTS_DIR`: Path to documents directory (default: ~/storage/documents)
- `BACKUP_DIR`: Path to backups directory (default: ~/storage/backups)

## File Serving

Files are served via the API endpoints:
- **Images**: `GET /api/admin/images/serve/{fileName}`
- **Documents**: Accessed through Product.digitalFile.url or Notification.pdfFile (stored path)

The image controller handles:
- Path traversal validation (security)
- MIME type detection
- Cache headers (max-age=86400)

## Schema Compatibility

### Product Schema
```javascript
thumbnail: {
  url: String,              // Required - served path
  key: String,              // File name in storage
  bucket: String,           // 'local-storage'
  mimeType: String,         // 'image/jpeg', etc.
  altText: String,          // Optional description
  sortOrder: Number         // Display order
}

images: [{
  url: String,              // Required - served path
  key: String,              // File name in storage
  bucket: String,           // 'local-storage'
  mimeType: String,
  altText: String,
  sortOrder: Number
}]

digitalFile: {
  key: String,              // File name in storage
  bucket: String,           // 'local-storage'
  fileName: String,         // Original file name
  fileSize: Number          // File size in bytes
}
```

### Notification Schema
```javascript
pdfFile: {
  key: String,              // File name in storage
  bucket: String,           // 'local-storage'
  fileName: String,         // Original file name
  fileSize: Number          // File size in bytes
}
```

## Testing

After deployment, verify file storage works:

```bash
# Upload a product with files
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "data={\"title\":\"Test\", ...}" \
  -F "thumbnail=@image.jpg" \
  http://localhost/api/admin/products

# Verify files exist in storage
docker exec admin-service ls -la /root/storage/images/

# Verify served path works
curl http://localhost/api/admin/images/serve/{fileName}
```

## Migration from Old Schema

If you have existing products with old schema:

```javascript
// Update script (run once)
db.products.updateMany(
  { "thumbnail.path": { $exists: true } },
  [
    {
      $set: {
        thumbnail: {
          url: "$thumbnail.path",
          key: "$thumbnail.fileName",
          bucket: "local-storage",
          mimeType: "$thumbnail.mimeType",
          altText: "",
          sortOrder: 0
        }
      }
    }
  ]
);
```

