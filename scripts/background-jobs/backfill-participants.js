const { Firestore } = require("@google-cloud/firestore");

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountRaw) {
  console.error("FIREBASE_SERVICE_ACCOUNT environment variable is required.");
  process.exit(1);
}

const credentials = JSON.parse(serviceAccountRaw);
const db = new Firestore({ projectId: credentials.project_id, credentials });

async function run() {
  const requestsSnap = await db.collection("requests").get();
  let updated = 0;

  for (const requestDoc of requestsSnap.docs) {
    const request = requestDoc.data();
    const stepsSnap = await db.collection("steps").where("requestId", "==", requestDoc.id).get();
    const approverUserIds = [...new Set(stepsSnap.docs.map((doc) => doc.data().approverId).filter(Boolean))];

    const watcherUserIds = [];
    for (const email of request.watcherEmails ?? []) {
      const usersSnap = await db.collection("users").where("email", "==", String(email).trim().toLowerCase()).limit(1).get();
      if (usersSnap.docs.length > 0) watcherUserIds.push(usersSnap.docs[0].id);
    }

    const changed =
      JSON.stringify(request.approverUserIds ?? []) !== JSON.stringify(approverUserIds) ||
      JSON.stringify(request.watcherUserIds ?? []) !== JSON.stringify(watcherUserIds);

    if (changed) {
      await requestDoc.ref.update({ approverUserIds, watcherUserIds });
      updated += 1;
    }
  }

  console.log(`Requests updated with participant access: ${updated}`);
  await db.terminate();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
