#!/bin/bash
# Wait for all MongoDB nodes to be ready, then initialize replica set and create admin

set -e

MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Waiting for MongoDB nodes to be ready..."

# Wait for all nodes with better timeout handling
for node in mongo-primary mongo-secondary mongo-arbiter; do
  RETRIES=0
  until mongosh --host $node:27017 --eval "db.adminCommand('ping')" --quiet 2>/dev/null; do
    RETRIES=$((RETRIES+1))
    if [ $RETRIES -gt $MAX_RETRIES ]; then
      echo "❌ Timeout: $node did not become ready"
      exit 1
    fi
    echo "  Waiting for $node... (attempt $RETRIES/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
  done
  echo "  ✅ $node is ready"
done

echo ""
echo "All MongoDB nodes are ready. Checking Replica Set status..."
sleep 5

# Check if replica set is already initialized
RS_STATUS=$(mongosh --host mongo-primary:27017 --eval "try { rs.status().ok } catch(e) { 0 }" --quiet 2>/dev/null || echo "0")

if [ "$RS_STATUS" = "1" ]; then
  echo "✅ Replica set already initialized."
else
  echo "Initializing replica set rs0..."
  mongosh --host mongo-primary:27017 --eval '
    rs.initiate({
      _id: "rs0",
      members: [
        { _id: 0, host: "mongo-primary:27017", priority: 10 },
        { _id: 1, host: "mongo-secondary:27017", priority: 5 },
        { _id: 2, host: "mongo-arbiter:27017", arbiterOnly: true }
      ]
    });
  ' || echo "Replica set may already be initialized"
  
  echo "Waiting for Primary election..."
  
  # Critical: Wait until the node actually becomes PRIMARY
  RETRIES=0
  until mongosh --host mongo-primary:27017 --eval "db.isMaster().ismaster" --quiet 2>/dev/null | grep -q "true" || [ $RETRIES -eq 20 ]; do
    echo "  Still waiting for mongo-primary to become PRIMARY... (attempt $((RETRIES+1))/20)"
    sleep 3
    RETRIES=$((RETRIES+1))
  done
  
  if [ $RETRIES -eq 20 ]; then
    echo "⚠️ WARNING: mongo-primary did not become PRIMARY, but continuing..."
  else
    echo "✅ mongo-primary is now PRIMARY"
  fi
fi

# Now check if the admin user exists, if not, create it
echo "Checking for admin user..."
USER_EXISTS=$(mongosh --host mongo-primary:27017 --eval 'db.getSiblingDB("admin").getUser("admin")' --quiet 2>/dev/null)

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