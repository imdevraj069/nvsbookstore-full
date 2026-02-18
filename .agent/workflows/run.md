---
description: How to run the entire NVS BookStore project with Docker and get a public Cloudflare tunnel URL
---

# Run NVS BookStore

## Prerequisites
- Docker and Docker Compose installed
- Sudo access (or user in docker group)

## Quick Start

// turbo-all

1. Navigate to project root:
```
cd /home/dev/Documents/projects/dumps/nvsbookstore
```

2. Build and start everything:
```
sudo docker compose up -d --build
```

3. Wait ~60 seconds for all services to start, then check status:
```
sudo docker compose ps
```

4. Get the Cloudflare tunnel URL (look for the `.trycloudflare.com` URL):
```
sudo docker compose logs cloudflare-tunnel 2>&1 | grep -o 'https://.*\.trycloudflare\.com'
```

5. Verify backend health:
```
curl http://localhost/health/read
curl http://localhost/health/transaction
curl http://localhost/health/admin
```

## Architecture

```
┌─────────────────────┐
│  Cloudflare Tunnel   │  ← public https://xxx.trycloudflare.com
│         ↓           │
│     Nginx (:80)     │  ← API gateway + frontend proxy
│    /api/* → backends │
│    /*     → Next.js   │
├─────────────────────┤
│  read-service:3001   │  ← cached reads from Redis + Mongo secondary
│  transaction:3002    │  ← auth, cart, orders, payments
│  admin:3003          │  ← CRUD, MinIO uploads
│  worker              │  ← email, invoicing, cache invalidation
│  web:3000            │  ← Next.js frontend
├─────────────────────┤
│  mongo (replica set) │  primary:27017, secondary:27018, arbiter:27019
│  redis:6379          │  caching
│  rabbitmq:5672       │  event messaging
│  minio:9000          │  file storage
└─────────────────────┘
```

## Useful Commands

- **View all logs:** `sudo docker compose logs -f`
- **View specific service:** `sudo docker compose logs -f web`
- **Rebuild single service:** `sudo docker compose build read-service && sudo docker compose up -d read-service`
- **Stop everything:** `sudo docker compose down`
- **Stop + remove volumes:** `sudo docker compose down -v`
- **RabbitMQ dashboard:** http://localhost:15672 (guest/guest)
- **MinIO console:** http://localhost:9001 (minioadmin/minioadmin)
