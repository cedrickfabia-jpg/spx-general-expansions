const { Firestore } = require("@google-cloud/firestore");

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountRaw) {
  console.error("FIREBASE_SERVICE_ACCOUNT environment variable is required.");
  process.exit(1);
}

const credentials = JSON.parse(serviceAccountRaw);
const db = new Firestore({ projectId: credentials.project_id, credentials });

const REMINDER_AFTER_DAYS = Number(process.env.REMINDER_AFTER_DAYS ?? 1);
const ESCALATION_AFTER_DAYS = Number(process.env.ESCALATION_AFTER_DAYS ?? 7);

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function addNotification(userId, title, message) {
  await db.collection("notifications").add({
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString()
  });
}

async function run() {
  const reminderCutoff = isoDaysAgo(REMINDER_AFTER_DAYS);
  const escalationCutoff = isoDaysAgo(ESCALATION_AFTER_DAYS);
  const requestsSnap = await db.collection("requests").where("submittedAt", "<", reminderCutoff).get();

  let remindersSent = 0;
  let escalationsSent = 0;

  for (const requestDoc of requestsSnap.docs) {
    const request = requestDoc.data();
    if (request.status !== "PENDING_APPROVAL" && request.status !== "QUESTION_RAISED") continue;

    const stepsSnap = await db.collection("steps").where("requestId", "==", requestDoc.id).get();
    const activeStep = stepsSnap.docs.map((doc) => doc.data()).find((step) => step.status === "ACTIVE");
    const questionStep = stepsSnap.docs.map((doc) => doc.data()).find((step) => step.status === "QUESTION_RAISED");

    const targetUserId = questionStep ? request.requesterId : activeStep?.approverId;
    if (!targetUserId) continue;

    await addNotification(
      targetUserId,
      questionStep ? "Reminder: Question is waiting for you" : "Reminder: Approval is pending",
      `${request.title || "HOD Approval request"} has been waiting since ${request.submittedAt}.`
    );
    remindersSent += 1;

    if (request.submittedAt && request.submittedAt < escalationCutoff) {
      const adminsSnap = await db.collection("users").where("roles", "array-contains", "ADMINISTRATOR").get();
      for (const adminDoc of adminsSnap.docs) {
        await addNotification(
          adminDoc.id,
          "Escalation: Approval is overdue",
          `${request.title || "HOD Approval request"} has been pending since ${request.submittedAt}.`
        );
        escalationsSent += 1;
      }
    }
  }

  console.log(`Reminders sent: ${remindersSent}`);
  console.log(`Escalations sent: ${escalationsSent}`);
  await db.terminate();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
