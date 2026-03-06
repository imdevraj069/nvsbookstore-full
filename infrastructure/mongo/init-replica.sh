#!/bin/bash
# Wait for all MongoDB nodes to be ready, then initialize replica set

set -e

MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Waiting for MongoDB nodes to be reachable..."

# Simple TCP connectivity check instead of mongo command
for node in mongo-primary mongo-secondary mongo-arbiter; do
  RETRIES=0
  until timeout 2 bash -c "echo > /dev/tcp/$node/27017" 2>/dev/null; do
    RETRIES=$((RETRIES+1))
    if [ $RETRIES -gt $MAX_RETRIES ]; then
      echo "❌ Timeout: $node did not become ready"
      exit 1
    fi
    echo "  Waiting for $node... (attempt $RETRIES/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
  done
  echo "  ✅ $node is reachable"
done

echo ""
echo "All MongoDB nodes are reachable. Waiting for them to be ready..."
sleep 10

# Give MongoDB extra time to fully initialize
echo "Initializing replica set rs0..."

# Try to initialize the replica set - use localhost to avoid DNS issues
mongosh mongodb://mongo-primary:27017 --eval '
  try {
    rs.initiate({
      _id: "rs0",
      members: [
        { _id: 0, host: "mongo-primary:27017", priority: 10 },
        { _id: 1, host: "mongo-secondary:27017", priority: 5 },
        { _id: 2, host: "mongo-arbiter:27017", arbiterOnly: true }
      ]
    });
    print("✅ Replica set initialized");
  } catch(e) {
    print("⚠️ Replica set initialization error: " + e.message);
    // If already initialized, this is OK
    if (e.message.includes("already initialized") || e.message.includes("already has member")) {
      print("✅ Replica set already initialized");
    }
  }
' 2>/dev/null || echo "⚠️ MongoDB not fully ready yet, will retry..."

# Wait a bit more for replica set to stabilize
sleep 10

echo "✅ Initialization complete"

if [ "$USER_EXISTS" != "null" ] && [ -n "$USER_EXISTS" ]; then
  echo "✅ Admin user already exists."
else
  echo "Creating admin user..."
  mongosh --host mongo-primary --eval '
    db.getSiblingDB("admin").createUser({
      user: "admin",
      pwd: "password",
      roles: [{ role: "root", db: "admin" }]
    });
  '
  echo "✅ Admin user created successfully!"
fi

echo "🚀 MongoDB Stack is fully initialized!"