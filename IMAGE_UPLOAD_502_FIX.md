# Image Upload 502 Bad Gateway — Troubleshooting Guide

## Problem
When uploading images via `POST /api/admin/images/upload`, you receive a **502 Bad Gateway** error from Cloudflare. The request content type is `multipart/form-data` with file size around 187KB.

## Root Causes & Fixes Applied

### 1. ✅ Nginx Proxy Timeout & Buffer Issues (FIXED)
**Issue**: Nginx default timeouts (60s) and buffer sizes were too small for file uploads.

**Fix Applied**: Updated `/infrastructure/nginx/nginx.conf` with:
```nginx
location /api/admin {
    proxy_pass http://admin_service;
    # ... headers ...
    # Increase timeouts for file operations
    proxy_connect_timeout 60s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    # Enable buffering for large uploads
    proxy_buffering on;
    proxy_buffer_size 128k;
    proxy_buffers 256 16k;
    proxy_busy_buffers_size 256k;
}
```

### 2. ✅ Docker Service Dependencies (FIXED)
**Issue**: Admin service didn't wait for Redis to be healthy before starting.

**Fix Applied**: Updated `docker-compose.yml` admin-service dependencies:
```yaml
depends_on:
  mongo-init:
    condition: service_completed_successfully
  minio:
    condition: service_healthy
  redis:
    condition: service_healthy    # ← ADDED
  rabbitmq:
    condition: service_healthy
```

## Debugging Steps

### Step 1: Check if admin-service is running
```bash
docker ps | grep admin-service
# OR
docker logs admin-service
```

### Step 2: Verify service health
```bash
curl http://localhost:3003/health
# Expected: {"status":"ok","service":"admin-service"}
```

### Step 3: Test upload directly (bypass Nginx/Cloudflare)
```bash
TOKEN="your-jwt-token-here"
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/image.jpg" \
  http://localhost:3003/api/admin/images/upload
```

### Step 4: Check Docker container logs
```bash
docker-compose logs -f admin-service
docker-compose logs -f nginx
docker-compose logs -f redis
```

### Step 5: Verify storage directory permissions
The service tries to write images to `~/storage/images/`. Ensure:
```bash
ls -la ~/storage/
# Should be writable by the docker container user
```

### Step 6: Check Cloudflare Tunnel connection
```bash
docker logs cloudflare-tunnel
# Should show "tunnel XXXXX registered with 'Sarkari' account"
```

## Common Issues & Solutions

### Issue: "Connection refused" at admin-service
**Cause**: Service crashed during startup (Redis/MongoDB connection failure)
**Solution**: 
```bash
docker-compose down
docker-compose up --build admin-service
```

### Issue: "504 Gateway Timeout" from Cloudflare
**Cause**: Nginx or service taking >100s to respond
**Solution**: Already fixed via timeout increases. If persists:
- Increase `proxy_read_timeout` to `600s` in nginx.conf
- Check MongoDB replica set health: `docker exec mongo-primary mongo --eval "rs.status()"`

### Issue: "Permission denied" writing to storage
**Cause**: Docker container can't write to home directory
**Solution**: Use Docker volumes instead of home directory in docker-compose.yml
```yaml
admin-service:
  volumes:
    - admin_storage:/app/storage
volumes:
  admin_storage:
```

### Issue: "413 Payload Too Large" from Nginx
**Cause**: Client body size limit exceeded
**Already Fixed**: Set in nginx.conf line 21: `client_max_body_size 50m;`

## Environment Variables to Verify

Ensure these are set in your `.env` or `docker-compose.yml`:
```bash
MONGO_URI=mongodb://mongo-primary:27017/nvsbookstore?replicaSet=rs0
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
MINIO_URL=http://minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=72h
```

## Quick Restart

After applying fixes, rebuild and restart:
```bash
docker-compose down
docker-compose up --build
```

Monitor startup:
```bash
docker-compose logs -f
```

## Testing Upload

Once running, test with:
```bash
# 1. Get auth token
TOKEN=$(curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' | jq -r '.data.token')

# 2. Upload image
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test.jpg" \
  http://localhost/api/admin/images/upload
```

## Performance Notes

- **Max file size**: 50MB (configurable in nginx.conf)
- **Upload timeout**: 300 seconds (5 minutes)
- **Expected response time**: 1-5 seconds for typical uploads
- **Redis caching**: Enabled for subsequent requests

## Additional Notes

- The admin-service stores images in `~/storage/images/` on the host
- Multer uses memory storage (suitable for images up to ~50MB)
- Consider using MinIO directly for production scale deployments
- All admin routes require JWT authentication + admin role

