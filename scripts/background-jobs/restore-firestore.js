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

function findBackupFile() {
  const argIndex = process.argv.indexOf("--file");
  if (argIndex > -1 && process.argv[argIndex + 1]) return process.argv[argIndex + 1];
  if (process.env.BACKUP_FILE) return process.env.BACKUP_FILE;
  console.error("Provide a backup file with --file <path> or BACKUP_FILE env.");
  process.exit(1);
}

async function run() {
  const backupPath = findBackupFile();
  const backup = JSON.parse(fs.readFileSync(path.resolve(backupPath), "utf8"));
  let restored = 0;
  for (const collectionName of Object.keys(backup)) {
    const docs = backup[collectionName] ?? [];
    for (let i = 0; i < docs.length; i += 400) {
      const batch = db.batch();
      for (const doc of docs.slice(i, i + 400)) {
        const { id, ...data } = doc;
        batch.set(db.collection(collectionName).doc(id), data, { merge: true });
      }
      await batch.commit();
      restored += docs.slice(i, i + 400).length;
    }
  }
  console.log(`Restored ${restored} documents from ${backupPath}`);
  await db.terminate();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
