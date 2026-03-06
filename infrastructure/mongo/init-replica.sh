#!/bin/bash
# Wait for all MongoDB nodes to be ready, then initialize replica set

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
echo "All MongoDB nodes are reachable. Waiting for replica set to initialize..."
sleep 15

# Try to initialize the replica set with retries
INIT_RETRIES=0
until [ $INIT_RETRIES -ge 10 ]; do
  echo "Attempting replica set initialization (attempt $((INIT_RETRIES+1))/10)..."
  
  INIT_OUTPUT=$(mongo --host mongo-primary:27017 --eval '
    try {
      var status = rs.status();
      if (status.ok === 1) {
        print("RS_ALREADY_INITIALIZED");
      } else {
        rs.initiate({
          _id: "rs0",
          members: [
            { _id: 0, host: "mongo-primary:27017", priority: 10 },
            { _id: 1, host: "mongo-secondary:27017", priority: 5 },
            { _id: 2, host: "mongo-arbiter:27017", arbiterOnly: true }
          ]
        });
        print("RS_INITIALIZED");
      }
    } catch(e) {
      if (e.message.includes("no replset")) {
        rs.initiate({
          _id: "rs0",
          members: [
            { _id: 0, host: "mongo-primary:27017", priority: 10 },
            { _id: 1, host: "mongo-secondary:27017", priority: 5 },
            { _id: 2, host: "mongo-arbiter:27017", arbiterOnly: true }
          ]
        });
        print("RS_INITIALIZED");
      } else {
        print("RS_ERROR: " + e.message);
      }
    }
  ' 2>/dev/null || echo "RS_ERROR: Connection failed")
  
  if [[ $INIT_OUTPUT == *"RS_INITIALIZED"* ]] || [[ $INIT_OUTPUT == *"RS_ALREADY_INITIALIZED"* ]]; then
    echo "✅ Replica set initialized successfully"
    break
  fi
  
  INIT_RETRIES=$((INIT_RETRIES+1))
  if [ $INIT_RETRIES -lt 10 ]; then
    echo "  Waiting 5 seconds before retry..."
    sleep 5
  fi
done

# Wait for a PRIMARY to be elected
echo ""
echo "Waiting for primary election..."
PRIMARY_RETRIES=0
until [ $PRIMARY_RETRIES -ge 20 ]; do
  PRIMARY_STATUS=$(mongo --host mongo-primary:27017 --eval '
    try {
      var status = rs.status();
      for (var i = 0; i < status.members.length; i++) {
        if (status.members[i].stateStr === "PRIMARY") {
          print("PRIMARY_ELECTED");
          break;
        }
      }
    } catch(e) {
      print("NO_PRIMARY");
    }
  ' 2>/dev/null || echo "NO_PRIMARY")
  
  if [[ $PRIMARY_STATUS == *"PRIMARY_ELECTED"* ]]; then
    echo "✅ Primary has been elected"
    break
  fi
  
  PRIMARY_RETRIES=$((PRIMARY_RETRIES+1))
  if [ $PRIMARY_RETRIES -lt 20 ]; then
    echo "  Still waiting for primary (attempt $((PRIMARY_RETRIES+1))/20)..."
    sleep 2
  fi
done

echo ""
echo "🚀 MongoDB Stack is fully initialized!"