# Ubuntu Server Storage Configuration

## Storage Location

All images, documents, and backups are now stored in the user's home directory on Ubuntu server:

```
~/ (User Home Directory)
└── storage/
    ├── images/          → Product images, thumbnails, gallery
    ├── documents/       → PDFs, Office files, digital products
    └── backups/         → Automated backup ZIP files
```

**Example paths:**
- Images: `~/storage/images/1704067200000-product-image.jpg`
- Documents: `~/storage/documents/1704067500000-ebook.pdf`
- Backups: `~/storage/backups/backup-2024-01-01T12-00-00-000Z.zip`

---

## Setup Instructions

### Step 1: Create Directories
```bash
mkdir -p ~/storage/images ~/storage/documents ~/storage/backups
chmod 755 ~/storage/images ~/storage/documents ~/storage/backups
```

### Step 2: Update .env File
```bash
# Storage directories (automatically expands ~ to home directory)
IMAGES_DIR=~/storage/images
DOCUMENTS_DIR=~/storage/documents
BACKUP_DIR=~/storage/backups

# Cache
REDIS_URL=redis://localhost:6379

# Backup cloud upload (optional)
CLOUD_BACKUP_ENABLED=false
```

### Step 3: Restart Service
```bash
cd /path/to/project
docker-compose down
docker-compose up admin-service
```

---

## How It Works

The system automatically expands `~` to your home directory using Node.js `os.homedir()`:

```javascript
const os = require('os');
const homeDir = os.homedir();  // Returns /home/username

const IMAGES_DIR = process.env.IMAGES_DIR || path.join(homeDir, 'storage', 'images');
// Result: /home/username/storage/images (if env not set)
```

---

## Directory Structure

```
/home/username/storage/
├── images/
│   ├── 1704067200000-thumbnail.jpg
│   ├── 1704067300000-gallery-1.png
│   └── 1704067400000-notification.webp
│
├── documents/
│   ├── 1704067500000-ebook.pdf
│   ├── 1704067600000-manual.docx
│   └── 1704067700000-spreadsheet.xlsx
│
└── backups/
    ├── backup-2024-01-01T12-00-00-000Z.zip
    ├── backup-2024-01-01T18-00-00-000Z.zip
    └── backup-2024-01-02T00-00-00-000Z.zip
```

---

## Monitoring Disk Space

### Check Current Usage
```bash
du -sh ~/storage/images
du -sh ~/storage/documents
du -sh ~/storage/backups
du -sh ~/storage          # Total storage usage
```

### Check Available Space
```bash
df -h ~
```

### Monitor Growth
```bash
# Watch storage grow in real-time
watch -n 5 'du -sh ~/storage/*'
```

---

## Permissions

The storage directories are created with standard Unix permissions:

```bash
drwxr-xr-x  (755)  images      # Owner: read/write/execute, Others: read/execute
drwxr-xr-x  (755)  documents   # Owner: read/write/execute, Others: read/execute
drwxr-xr-x  (755)  backups     # Owner: read/write/execute, Others: read/execute
```

The service runs as the Docker container user and needs write access. Make sure:

```bash
# Verify ownership (should be readable by service)
ls -la ~/storage/

# If needed, ensure proper permissions
chmod -R 755 ~/storage/
```

---

## Automated Backups

Backups are created automatically every 6 hours and stored in `~/storage/backups/`:

```bash
# View backup history
ls -lh ~/storage/backups/

# Check most recent backup
ls -lht ~/storage/backups/ | head -5

# Manual backup trigger (optional)
curl -X POST http://localhost:3003/api/admin/backups/create
```

---

## Environment Variable Alternatives

You can also set absolute paths if preferred:

```bash
# Option 1: Use home directory path (recommended)
IMAGES_DIR=~/storage/images

# Option 2: Use absolute path
IMAGES_DIR=/home/username/storage/images

# Option 3: Use default (home directory)
# IMAGES_DIR not set → defaults to ~/storage/images
```

---

## Troubleshooting

### Files Not Saving
**Symptom:** Upload fails, files not appearing in `~/storage/images/`

**Solution:**
```bash
# Check if directory exists
ls -la ~/storage/images/

# Create if missing
mkdir -p ~/storage/images

# Check permissions
chmod 755 ~/storage/images

# Check available space
df -h ~
```

### Storage Full
**Symptom:** Uploads fail with "no space" error

**Solution:**
```bash
# Check which folder is largest
du -sh ~/storage/*

# Remove old backups (keeps last 5 automatically)
ls -lht ~/storage/backups/ | tail -n +6 | awk '{print $9}' | xargs rm

# Or archive and move to external storage
tar -czf ~/storage-archive.tar.gz ~/storage/
```

### Permission Denied
**Symptom:** Cannot write to storage directory

**Solution:**
```bash
# Fix ownership
chmod 755 ~/storage/
chmod 755 ~/storage/images ~/storage/documents ~/storage/backups

# If running as specific user
sudo chown username:username -R ~/storage/
```

---

## Docker Container Access

If the service is running in Docker and needs to write to home directory:

```bash
# Mount home directory in docker-compose.yml
services:
  admin-service:
    volumes:
      - ${HOME}/storage:/root/storage  # Mount home storage to container
```

Or use absolute path in .env:

```bash
IMAGES_DIR=/root/storage/images
DOCUMENTS_DIR=/root/storage/documents
BACKUP_DIR=/root/storage/backups
```

---

## Security Notes

1. **File Permissions:** Files created are world-readable by default (timestamp prefix prevents guessing)
2. **Backup Access:** API endpoints require admin authentication
3. **Local Storage:** Files never leave the server (unless cloud backup enabled)
4. **Automatic Cleanup:** Old files deleted when products/notifications removed

---

## References

- Node.js `os.homedir()`: Returns the home directory of the current user
- Ubuntu storage: Standard `~` expansion works in paths
- File paths: Use forward slashes `/` in configuration

---

**Status:** ✅ Configured for Ubuntu server with home directory storage
