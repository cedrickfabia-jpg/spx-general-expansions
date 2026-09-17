const { Firestore } = require("@google-cloud/firestore");

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountRaw) {
  console.error("FIREBASE_SERVICE_ACCOUNT environment variable is required.");
  process.exit(1);
}

const credentials = JSON.parse(serviceAccountRaw);
const db = new Firestore({ projectId: credentials.project_id, credentials });
const MAX_DOCS = Number(process.env.MAX_DOCS ?? 20000);

async function run() {
  const collections = await db.listCollections();
  let overLimit = false;
  for (const collection of collections) {
    const snapshot = await collection.get();
    const count = snapshot.size;
    console.log(`${collection.id}: ${count}`);
    if (count > MAX_DOCS) {
      console.error(`${collection.id} exceeds ${MAX_DOCS} documents.`);
      overLimit = true;
    }
  }
  await db.terminate();
  if (overLimit) process.exit(1);
  console.log("Performance check passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
