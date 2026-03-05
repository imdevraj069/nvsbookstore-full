# Storage Configuration Reference — Ubuntu Server

## Quick Command Reference

### Setup
```bash
# Create directories
mkdir -p ~/storage/images ~/storage/documents ~/storage/backups
chmod 755 ~/storage/images ~/storage/documents ~/storage/backups

# Verify
ls -la ~/storage/
```

### Monitor
```bash
# Check disk usage
du -sh ~/storage/*

# Check available space
df -h ~

# List recent files
ls -lht ~/storage/images/ | head -5
```

### Troubleshoot
```bash
# Test path expansion
node -e "const path = require('path'); const os = require('os'); console.log(path.join(os.homedir(), 'storage', 'images'));"

# Check permissions
ls -la ~/storage/images
chmod 755 ~/storage/images
```

---

## Environment Variables

### Full Configuration
```bash
# Storage
IMAGES_DIR=~/storage/images
DOCUMENTS_DIR=~/storage/documents
BACKUP_DIR=~/storage/backups

# Cache
REDIS_URL=redis://localhost:6379

# Backup options
CLOUD_BACKUP_ENABLED=false
BACKUP_BUCKET=my-backups
```

### Environment Variable Expansion
```bash
# ~ is automatically expanded to user home directory
~/storage/images  →  /home/username/storage/images

# Or use explicit paths
/home/username/storage/images
```

---

## Storage Paths

### Default Locations
```
~/storage/images/      → Product images, thumbnails, gallery
~/storage/documents/   → PDFs, Office files, digital products
~/storage/backups/     → Automated ZIP backups
```

### File Examples
```
~/storage/images/1704067200000-product-photo.jpg
~/storage/documents/1704067500000-user-guide.pdf
~/storage/backups/backup-2024-01-01T12-00-00-000Z.zip
```

---

## Node.js Home Directory Detection

### How It Works
```javascript
const os = require('os');
const homeDir = os.homedir();  // Returns user home directory

// Examples:
// Linux:   /home/username
// macOS:   /Users/username
// Windows: C:\Users\username
```

### Module Defaults
```javascript
// imageStorage.js
const IMAGES_DIR = process.env.IMAGES_DIR || 
  path.join(homeDir, 'storage', 'images');

// Resolves to: ~/storage/images
```

---

## Ubuntu Server Specifics

### Standard Paths
```
User Home:           /home/username
Project Directory:   /path/to/project
Storage Directory:   /home/username/storage (separated from project)
```

### Permissions
```bash
# Owner can read/write/execute
# Others can read/execute
chmod 755 ~/storage/

# Check current permissions
ls -ld ~/storage/images
# Expected: drwxr-xr-x
```

### Service Integration
```bash
# If running as service user
sudo usermod -d /home/serviceuser service

# Mount in Docker
volumes:
  - /home/user/storage:/root/storage
```

---

## Common Operations

### List Files
```bash
# All images
ls ~/storage/images/

# Images from last 24 hours
find ~/storage/images/ -mtime -1

# Specific file type
ls ~/storage/documents/*.pdf
```

### Clean Up
```bash
# Remove old backups (keeps recent ones)
cd ~/storage/backups && ls -t | tail -n +6 | xargs rm

# Archive large backups
tar -czf archive.tar.gz ~/storage/backups/old-backup.zip
```

### Monitor Growth
```bash
# Watch real-time changes
watch -n 2 'du -sh ~/storage/*'

# Largest files
du -sh ~/storage/*/* | sort -h | tail -20
```

---

## Docker Integration

### Mount Volume
```yaml
services:
  admin-service:
    volumes:
      - ${HOME}/storage:/root/storage
    environment:
      IMAGES_DIR: /root/storage/images
```

### From Container
```bash
# Inside container
ls /root/storage/images/

# Maps to host
~/storage/images/
```

---

## Verification Checklist

- [ ] Directories created: `mkdir -p ~/storage/{images,documents,backups}`
- [ ] Permissions set: `chmod 755 ~/storage/*`
- [ ] .env variables updated with `~/storage/` paths
- [ ] Service restarted: `docker-compose restart admin-service`
- [ ] Files uploading to correct location
- [ ] Backups creating in `~/storage/backups/`
- [ ] No permission errors in logs

---

## Troubleshooting

### Files Not Saving
```bash
# Check directory exists
test -d ~/storage/images && echo "OK" || echo "Missing"

# Check permissions
ls -la ~/storage/ | grep images

# Create if needed
mkdir -p ~/storage/images
chmod 755 ~/storage/images
```

### Permission Denied
```bash
# Fix permissions
chmod 755 ~/storage/images ~/storage/documents ~/storage/backups

# Check ownership
ls -la ~/storage/

# Fix ownership
sudo chown $USER:$USER ~/storage/
```

### Disk Full
```bash
# Check available space
df -h ~

# Find large files
du -sh ~/storage/* | sort -hr

# Archive old backups
tar -czf backup-archive-2024.tar.gz ~/storage/backups/
rm ~/storage/backups/backup-*.zip
```

---

## Performance Tuning

### Monitor Cache Hit Rate
```bash
curl http://localhost:3003/api/admin/cache/stats
```

### Backup Performance
```bash
# Check backup size and creation time
ls -lh ~/storage/backups/ | head -5
time docker-compose exec admin-service curl -X POST /api/admin/backups/create
```

### Disk I/O
```bash
# Monitor real-time disk usage
iostat -x 1 10 ~/storage/
```

---

## Backup Strategy

### Automatic Backups
- Created every 6 hours
- Located in `~/storage/backups/`
- Last 5 backups kept
- Compress to ZIP format

### Manual Backup
```bash
# Trigger backup
curl -X POST http://localhost:3003/api/admin/backups/create

# Download backup
curl -O http://localhost:3003/api/admin/backups/download/backup-2024-01-01T12-00-00.zip
```

### Restore
```bash
# Extract backup
unzip ~/storage/backups/backup-2024-01-01T12-00-00.zip

# Restore files
cp -r backup/storage/* ~/storage/

# Restore MongoDB from backup metadata
```

---

## Documentation References

- **Complete Setup:** See UBUNTU_STORAGE_CONFIG.md
- **Quick Start:** See QUICK_START_MINIO_REMOVAL.md
- **Technical Details:** See MINIO_REMOVAL_MIGRATION.md
- **Architecture:** See ARCHITECTURE_REDESIGN_SUMMARY.md

---

**Last Updated:** 2024  
**Status:** ✅ Ubuntu Server Storage Configuration Complete
