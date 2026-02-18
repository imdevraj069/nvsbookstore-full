#!/bin/bash
# Wait for all MongoDB nodes to be ready, then initialize replica set

set -e

echo "Waiting for MongoDB nodes to be ready..."

# Wait for mongo-primary
until mongosh --host mongo-primary --eval "db.adminCommand('ping')" --quiet 2>/dev/null; do
  echo "  Waiting for mongo-primary..."
  sleep 2
done
echo "  ✅ mongo-primary is ready"

# Wait for mongo-secondary
until mongosh --host mongo-secondary --eval "db.adminCommand('ping')" --quiet 2>/dev/null; do
  echo "  Waiting for mongo-secondary..."
  sleep 2
done
echo "  ✅ mongo-secondary is ready"

# Wait for mongo-arbiter
until mongosh --host mongo-arbiter --eval "db.adminCommand('ping')" --quiet 2>/dev/null; do
  echo "  Waiting for mongo-arbiter..."
  sleep 2
done
echo "  ✅ mongo-arbiter is ready"

echo ""
echo "All MongoDB nodes are ready. Initializing replica set..."

# Check if replica set is already initialized
RS_STATUS=$(mongosh --host mongo-primary --eval "try { rs.status().ok } catch(e) { 0 }" --quiet 2>/dev/null || echo "0")

if [ "$RS_STATUS" = "1" ]; then
  echo "✅ Replica set already initialized, skipping."
else
  echo "Initializing replica set rs0..."
  mongosh --host mongo-primary --eval '
    rs.initiate({
      _id: "rs0",
      members: [
        { _id: 0, host: "mongo-primary:27017", priority: 10 },
        { _id: 1, host: "mongo-secondary:27017", priority: 5 },
        { _id: 2, host: "mongo-arbiter:27017", arbiterOnly: true }
      ]
    });
  '

  echo "Waiting for replica set to elect primary..."
  sleep 10

  # Verify
  mongosh --host mongo-primary --eval "rs.status()" --quiet
  echo ""
  echo "✅ Replica set initialized successfully!"
fi
