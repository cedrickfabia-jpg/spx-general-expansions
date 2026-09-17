const { Firestore } = require("@google-cloud/firestore");

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountRaw) {
  console.error("FIREBASE_SERVICE_ACCOUNT environment variable is required.");
  process.exit(1);
}

const credentials = JSON.parse(serviceAccountRaw);
const db = new Firestore({ projectId: credentials.project_id, credentials });

async function run() {
  const statusRef = db.collection("status").doc("errorCheck");
  const statusSnap = await statusRef.get();
  const lastCheckedAt = statusSnap.exists ? String(statusSnap.data().lastCheckedAt ?? "") : new Date(0).toISOString();
  const snap = await db.collection("errorLogs").where("createdAt", ">", lastCheckedAt).get();
  await statusRef.set({ lastCheckedAt: new Date().toISOString() }, { merge: true });
  console.log(`New errors since last check: ${snap.size}`);
  await db.terminate();
  if (snap.size > 0) process.exit(2);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
