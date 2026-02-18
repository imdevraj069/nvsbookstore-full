// MongoDB Replica Set Initialization Script
rs.initiate({
  _id: "rs0",
  members: [
    {
      _id: 0,
      host: "mongo-primary:27017",
      priority: 10
    },
    {
      _id: 1,
      host: "mongo-secondary:27017",
      priority: 5
    },
    {
      _id: 2,
      host: "mongo-arbiter:27017",
      arbiterOnly: true
    }
  ]
});

// Wait for replica set to initialize
sleep(5000);

// Create admin user
db.getSiblingDB("admin").createUser({
  user: "admin",
  pwd: "password",
  roles: ["root"]
});

print("Replica set initialized successfully!");
