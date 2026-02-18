#!/bin/bash

# MinIO Bucket Creation Script
set -e

echo "Creating MinIO buckets..."

# Wait for MinIO to be ready
sleep 10

# Create buckets using MinIO Client (mc)
mc alias set minio http://minio:9000 minioadmin minioadmin

mc mb minio/products --ignore-existing
mc mb minio/results --ignore-existing

echo "Buckets created successfully!"
