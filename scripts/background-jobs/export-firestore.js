const fs = require("fs");
const path = require("path");
const { Firestore } = require("@google-cloud/firestore");

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountRaw) {
  console.error("FIREBASE_SERVICE_ACCOUNT environment variable is required.");
  process.exit(1);
}

const credentials = JSON.parse(serviceAccountRaw);
const db = new Firestore({ projectId: credentials.project_id, credentials });

async function run() {
  const collections = await db.listCollections();
  const backup = {};
  for (const collection of collections) {
    const snapshot = await collection.get();
    backup[collection.id] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join(process.cwd(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `firestore-backup-${date}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`Backup written: ${file}`);
  await db.terminate();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
