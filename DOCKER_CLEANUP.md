# Docker Cleanup & Fresh Build Commands

## Complete Docker Cleanup (Nuclear Option)

Run this to completely clean Docker and start fresh:

```bash
# Stop all containers
docker stop $(docker ps -aq) 2>/dev/null || true

# Remove all containers
docker rm $(docker ps -aq) 2>/dev/null || true

# Remove all volumes
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# Remove all unused images, containers, networks, and dangling volumes
docker system prune -a --volumes -f

# Verify cleanup
docker ps
docker images
docker volume ls
```

## Alternative: Selective Cleanup

If you want to keep some images/volumes:

```bash
# Stop only nvsbookstore containers
docker stop $(docker ps -a --filter "label=com.docker.compose.project=nvsbookstore" -q) 2>/dev/null || true

# Remove only nvsbookstore containers
docker rm $(docker ps -a --filter "label=com.docker.compose.project=nvsbookstore" -q) 2>/dev/null || true

# Remove only nvsbookstore volumes
docker volume rm $(docker volume ls --filter "name=nvsbookstore" -q) 2>/dev/null || true
```

## Full Fresh Build Procedure

```bash
cd /path/to/nvsbookstore

# 1. Clean Docker completely (optional, only if needed)
docker system prune -a --volumes -f

# 2. Remove any leftover volumes
docker volume prune -f

# 3. Stop existing containers
docker-compose down -v

# 4. Rebuild images (no cache)
docker-compose build --no-cache

# 5. Bring up all services
docker-compose up -d

# 6. Monitor startup
docker-compose logs -f
```

## Verify Clean Build

```bash
# Check all services are running
docker-compose ps

# Check admin-service health
curl http://localhost:3003/health

# Check logs for errors
docker-compose logs admin-service | grep -i error
docker-compose logs nginx | grep -i error
docker-compose logs redis | grep -i error

# Check storage directories exist
docker exec admin-service ls -la /root/storage/
```

## Specific Service Restart

```bash
# Rebuild and restart only admin-service
docker-compose up -d --no-deps --build admin-service

# View logs
docker-compose logs -f admin-service

# Stop a service
docker-compose stop admin-service

# Start a service
docker-compose start admin-service
```

## Clean Storage Directories

```bash
# Delete all uploaded files and start fresh
docker exec admin-service rm -rf /root/storage/images/*
docker exec admin-service rm -rf /root/storage/documents/*
docker exec admin-service rm -rf /root/storage/backups/*

# Or delete entire storage
docker exec admin-service rm -rf /root/storage/

# Recreate empty storage structure
docker exec admin-service mkdir -p /root/storage/{images,documents,backups}
```

## One-Liner Complete Cleanup & Rebuild

```bash
docker-compose down -v && docker system prune -a --volumes -f && docker-compose build --no-cache && docker-compose up -d
```

## Verify File Storage

```bash
# Check if files are being stored in ~/storage/
docker exec admin-service ls -lah /root/storage/images/
docker exec admin-service ls -lah /root/storage/documents/

# Get the size of storage
docker exec admin-service du -sh /root/storage/
```

## Environment-Specific Cleanup

### Development Environment
```bash
# Keep images and volumes, just restart
docker-compose restart
```

### Testing Environment
```bash
# Clean database and storage, keep images
docker-compose down -v && docker-compose up -d
```

### Production Environment
```bash
# Backup first, then clean
docker volume create backup_$(date +%Y%m%d_%H%M%S)
docker-compose down
# ... perform backup ...
docker-compose up -d
```

## Troubleshooting

### If containers keep crashing
```bash
# View detailed logs
docker-compose logs -f --tail=100

# Check resource limits
docker stats
```

### If volumes are locked
```bash
# Force remove volumes
docker volume rm $(docker volume ls -q) -f

# Check dangling volumes
docker volume ls -f dangling=true
```

### If images won't rebuild
```bash
# Clear Docker build cache
docker builder prune -a -f

# Rebuild without cache
docker-compose build --no-cache --progress=plain
```

