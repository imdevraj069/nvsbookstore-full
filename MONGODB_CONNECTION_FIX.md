# MongoDB Connection Error Fix - Complete Guide

## Problem
The `transaction-service` and other services were failing with:
```
MongooseServerSelectionError: getaddrinfo EAI_AGAIN mongo-primary
```

## Root Causes
1. **MongoDB replica set not initialized** before services tried to connect
2. **`mongo-init` service completed but services didn't wait** for successful initialization
3. **No healthchecks** to verify services were truly ready
4. **Inadequate connection retry logic** in application code
5. **Missing socket/server timeouts** in Mongoose configuration

## Solutions Applied

### 1. ✅ Enhanced docker-compose.yml

**Added healthchecks** for all infrastructure services:
- MongoDB (mongo-primary, mongo-secondary, mongo-arbiter)
- RabbitMQ
- Redis
- MinIO

**Updated service dependencies** to use condition-based waiting:
```yaml
depends_on:
  mongo-init:
    condition: service_completed_successfully  # Wait for init to finish
  redis:
    condition: service_healthy                  # Wait for healthcheck
```

### 2. ✅ Improved MongoDB Initialization Script

Enhanced `/infrastructure/mongo/init-replica.sh`:
- Better error handling with explicit retry counts (30 retries max)
- Explicit port specification (`:27017`) for mongosh
- Added sleep delays between operations
- Handles already-initialized replica sets gracefully
- Provides more detailed logging

### 3. ✅ Robust Database Connection Logic

Updated `/packages/database/src/connection.js`:
- `serverSelectionTimeoutMS: 30000` - Wait up to 30 seconds to connect
- `socketTimeoutMS: 45000` - Keep sockets alive longer
- `maxPoolSize: 10` - Better connection pooling
- `minPoolSize: 2` - Maintain minimum connections
- **Automatic retry mechanism** - Retries every 5 seconds on failure (instead of immediate exit)

## How to Deploy

### Fresh Deployment
```bash
# Rebuild and start all services
docker-compose down -v  # Remove old volumes
docker-compose up --build

# Monitor logs
docker-compose logs -f transaction-service
```

### Troubleshooting Steps

1. **Check MongoDB replica set status:**
   ```bash
   docker exec mongo-primary mongosh --eval "rs.status()"
   ```

2. **Verify all containers are healthy:**
   ```bash
   docker-compose ps
   # All services should show "healthy" or "running"
   ```

3. **Check mongo-init logs:**
   ```bash
   docker logs mongo-init
   ```

4. **Test connectivity from a service:**
   ```bash
   docker exec transaction-service mongosh \
     mongodb://mongo-primary:27017,mongo-secondary:27017,mongo-arbiter:27017/?replicaSet=rs0
   ```

5. **View all service logs:**
   ```bash
   docker-compose logs -f --tail=50
   ```

## Key Changes Summary

| Component | Change | Benefit |
|-----------|--------|---------|
| docker-compose.yml | Added healthchecks | Ensures services are truly ready before dependent services start |
| docker-compose.yml | Changed `depends_on` | Waits for mongo-init completion + healthchecks |
| init-replica.sh | Better retry logic | Handles transient failures gracefully |
| connection.js | Added timeouts & pooling | Prevents connection hangs |
| connection.js | Auto-retry on failure | Services don't crash on transient MongoDB issues |

## Network Architecture
All services communicate within the **sarkari-network** bridge:
- MongoDB replicaset: `mongo-primary:27017`, `mongo-secondary:27017`, `mongo-arbiter:27017`
- RabbitMQ: `rabbitmq:5672`
- Redis: `redis:6379`
- MinIO: `minio:9000`

DNS resolution is automatic within Docker's bridge network.

## Monitoring

The improved init script provides clear feedback:
```
✅ mongo-primary is ready
✅ mongo-secondary is ready
✅ mongo-arbiter is ready
✅ Replica set already initialized
✅ mongo-primary is now PRIMARY
```

If you see timeout warnings, increase `MAX_RETRIES` in the init script or `serverSelectionTimeoutMS` in connection.js.

## Performance Notes

- **First deployment**: May take 60-90 seconds for MongoDB to initialize
- **Reconnection backoff**: Services retry every 5 seconds if MongoDB is unavailable
- **Max connection pool**: 10 concurrent connections per service
- **Connection timeout**: 30 seconds (enough for slow networks)

---

*Last Updated: March 6, 2026*
