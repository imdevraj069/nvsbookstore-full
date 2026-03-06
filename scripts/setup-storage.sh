#!/bin/bash

# Setup storage directories for file persistence
# This ensures storage persists on the host machine at ~/storage/
# and survives Docker container rebuilds

set -e

STORAGE_HOME="$HOME/storage"
IMAGES_DIR="$STORAGE_HOME/images"
DOCUMENTS_DIR="$STORAGE_HOME/documents"

echo "🔧 Setting up storage directories..."
echo "📁 Storage root: $STORAGE_HOME"

# Create directories if they don't exist
mkdir -p "$IMAGES_DIR"
mkdir -p "$DOCUMENTS_DIR"

echo "✅ Images directory created: $IMAGES_DIR"
echo "✅ Documents directory created: $DOCUMENTS_DIR"

# Set proper permissions
chmod -R 755 "$STORAGE_HOME"

echo ""
echo "✅ Storage setup complete!"
echo ""
echo "Docker bind mounts configured:"
echo "  • ~/storage/images → /root/storage/images (inside container)"
echo "  • ~/storage/documents → /root/storage/documents (inside container)"
echo ""
echo "Your files will be stored at: $STORAGE_HOME/"
echo "Persists across container rebuilds ✓"
