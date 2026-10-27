// Executed by the official MongoDB image only when its data volume is empty.
const databaseName = process.env.MONGO_INITDB_DATABASE;
const username = process.env.MONGO_APP_USERNAME;
const password = process.env.MONGO_APP_PASSWORD;

if (!databaseName || !username || !password) {
  throw new Error('MongoDB initialization requires application database credentials');
}

const applicationDb = db.getSiblingDB(databaseName);
if (!applicationDb.getUser(username)) {
  applicationDb.createUser({
    user: username,
    pwd: password,
    roles: [{ role: 'readWrite', db: databaseName }]
  });
}
