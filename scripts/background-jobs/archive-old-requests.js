const { Firestore } = require("@google-cloud/firestore");

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountRaw) {
  console.error("FIREBASE_SERVICE_ACCOUNT environment variable is required.");
  process.exit(1);
}

const credentials = JSON.parse(serviceAccountRaw);
const db = new Firestore({ projectId: credentials.project_id, credentials });
const ARCHIVE_MONTHS = Number(process.env.ARCHIVE_MONTHS ?? 6);

async function readRelated(collectionName, requestId) {
  const snap = await db.collection(collectionName).where("requestId", "==", requestId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function run() {
  const cutoff = new Date(Date.now() - ARCHIVE_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString();
  const requestsSnap = await db.collection("requests").where("createdAt", "<", cutoff).get();
  let archived = 0;

  for (const requestDoc of requestsSnap.docs) {
    const request = requestDoc.data();
    const activeStatuses = ["DRAFT", "PENDING_APPROVAL", "QUESTION_RAISED"];
    if (activeStatuses.includes(request.status)) continue;

    const steps = await readRelated("steps", requestDoc.id);
    const documents = await readRelated("documents", requestDoc.id);
    const comments = await readRelated("comments", requestDoc.id);
    const revisions = await readRelated("requestRevisions", requestDoc.id);
    const actions = await readRelated("actions", requestDoc.id);

    await db.collection("archivedRequests").doc(requestDoc.id).set({
      ...request,
      archivedAt: new Date().toISOString(),
      steps,
      documents,
      comments,
      revisions,
      actions
    });

    const batch = db.batch();
    steps.forEach((doc) => batch.delete(db.collection("steps").doc(doc.id)));
    documents.forEach((doc) => batch.delete(db.collection("documents").doc(doc.id)));
    comments.forEach((doc) => batch.delete(db.collection("comments").doc(doc.id)));
    revisions.forEach((doc) => batch.delete(db.collection("requestRevisions").doc(doc.id)));
    actions.forEach((doc) => batch.delete(db.collection("actions").doc(doc.id)));
    batch.delete(requestDoc.ref);
    await batch.commit();
    archived += 1;
  }

  console.log(`Archived requests: ${archived}`);
  await db.terminate();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
