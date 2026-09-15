import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, CpoBudgetStatus, Hub, RequestStatus, RoleName } from "@/features/hod-approvals/types";
import { REQUIRED_DOCUMENT_TYPES } from "@/features/hod-approvals/forms/fields";

export interface FreeStep {
  id: string;
  requestId: string;
  sequence: number;
  approverId: string;
  approverName: string;
  approverEmail: string;
  status: string;
  activatedAt: string | null;
  completedAt: string | null;
  comment: string | null;
}

export interface FreeDocument {
  id: string;
  requestId: string;
  documentName: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  versionNumber: number;
  uploadedBy: string;
  uploadedByName: string;
  storagePath: string;
  downloadUrl: string;
  createdAt: string;
}

export interface FreeRequest {
  id: string;
  requestNumber: string;
  title: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  hubId: string;
  hubName: string;
  status: RequestStatus;
  cpoBudgetStatus: CpoBudgetStatus | string;
  requiredApproverCount: number;
  formData: Record<string, unknown>;
  watcherEmails: string[];
  createdAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
}

export interface FreeNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface FreeAudit {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface FreeComment {
  id: string;
  requestId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  message: string;
  createdAt: string;
}

const nowIso = () => new Date().toISOString();

function requestFromDoc(id: string, data: Record<string, unknown>): FreeRequest {
  return {
    id,
    requestNumber: String(data.requestNumber ?? ""),
    title: String(data.title ?? ""),
    requesterId: String(data.requesterId ?? ""),
    requesterName: String(data.requesterName ?? ""),
    requesterEmail: String(data.requesterEmail ?? ""),
    hubId: String(data.hubId ?? ""),
    hubName: String(data.hubName ?? ""),
    status: (data.status as RequestStatus) ?? "DRAFT",
    cpoBudgetStatus: String(data.cpoBudgetStatus ?? ""),
    requiredApproverCount: Number(data.requiredApproverCount ?? 0),
    formData: (data.formData as Record<string, unknown>) ?? {},
    watcherEmails: Array.isArray(data.watcherEmails) ? data.watcherEmails.map(String) : [],
    createdAt: String(data.createdAt ?? ""),
    submittedAt: data.submittedAt ? String(data.submittedAt) : null,
    completedAt: data.completedAt ? String(data.completedAt) : null,
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : null
  };
}

function stepFromDoc(id: string, data: Record<string, unknown>): FreeStep {
  return {
    id,
    requestId: String(data.requestId ?? ""),
    sequence: Number(data.sequence ?? 1),
    approverId: String(data.approverId ?? ""),
    approverName: String(data.approverName ?? ""),
    approverEmail: String(data.approverEmail ?? ""),
    status: String(data.status ?? "PENDING"),
    activatedAt: data.activatedAt ? String(data.activatedAt) : null,
    completedAt: data.completedAt ? String(data.completedAt) : null,
    comment: data.comment ? String(data.comment) : null
  };
}

function documentFromDoc(id: string, data: Record<string, unknown>): FreeDocument {
  return {
    id,
    requestId: String(data.requestId ?? ""),
    documentName: String(data.documentName ?? ""),
    originalFilename: String(data.originalFilename ?? ""),
    mimeType: String(data.mimeType ?? "application/octet-stream"),
    size: Number(data.size ?? 0),
    versionNumber: Number(data.versionNumber ?? 1),
    uploadedBy: String(data.uploadedBy ?? ""),
    uploadedByName: String(data.uploadedByName ?? ""),
    storagePath: String(data.storagePath ?? ""),
    downloadUrl: String(data.downloadUrl ?? ""),
    createdAt: String(data.createdAt ?? "")
  };
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<AppUser>;
  const roles = data.roles ?? [];
  return {
    id: uid,
    googleId: data.googleId ?? null,
    email: data.email ?? "",
    name: data.name ?? "",
    profilePicture: data.profilePicture ?? null,
    active: data.active ?? true,
    roles,
    isAdmin: roles.includes("ADMINISTRATOR")
  };
}

export async function listUsers(): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db, "users"), orderBy("name")));
  return snap.docs.map((d) => ({
    id: d.id,
    googleId: (d.data().googleId as string | null) ?? null,
    email: String(d.data().email ?? ""),
    name: String(d.data().name ?? ""),
    profilePicture: (d.data().profilePicture as string | null) ?? null,
    active: d.data().active ?? true,
    roles: (d.data().roles as RoleName[]) ?? [],
    isAdmin: ((d.data().roles as RoleName[]) ?? []).includes("ADMINISTRATOR")
  }));
}

export async function setUserRoles(uid: string, roles: RoleName[]): Promise<void> {
  await updateDoc(doc(db, "users", uid), { roles, isAdmin: roles.includes("ADMINISTRATOR") });
}

export async function updateUserName(uid: string, name: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { name });
}

export async function listHubs(): Promise<Hub[]> {
  const snap = await getDocs(query(collection(db, "hubs"), orderBy("name")));
  return snap.docs.map((d) => ({
    id: d.id,
    name: String(d.data().name ?? ""),
    code: String(d.data().code ?? ""),
    active: d.data().active ?? true,
    createdAt: String(d.data().createdAt ?? ""),
    updatedAt: String(d.data().updatedAt ?? "")
  }));
}

export async function saveHub(hub: Partial<Hub> & { name: string; code: string }): Promise<string> {
  const now = nowIso();
  if (hub.id) {
    await updateDoc(doc(db, "hubs", hub.id), { name: hub.name, code: hub.code, active: hub.active ?? true, updatedAt: now });
    return hub.id;
  }
  const ref = await addDoc(collection(db, "hubs"), { name: hub.name, code: hub.code, active: hub.active ?? true, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function deleteHub(id: string): Promise<void> {
  await deleteDoc(doc(db, "hubs", id));
}

export async function getRoutesForHub(hubId: string) {
  const snap = await getDocs(query(collection(db, "hubs", hubId, "routes"), orderBy("slot")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

export async function saveRoute(hubId: string, slot: number, approverUserId: string, approverName: string, approverEmail: string): Promise<void> {
  const ref = doc(db, "hubs", hubId, "routes", String(slot));
  await setDoc(ref, { slot, approverUserId, approverName, approverEmail, updatedAt: nowIso() }, { merge: true });
}

export async function getRequest(id: string): Promise<FreeRequest | null> {
  const snap = await getDoc(doc(db, "requests", id));
  if (!snap.exists()) return null;
  return requestFromDoc(snap.id, snap.data() as Record<string, unknown>);
}

export async function listMyRequests(userId: string): Promise<FreeRequest[]> {
  const snap = await getDocs(query(collection(db, "requests"), where("requesterId", "==", userId)));
  return snap.docs.map((d) => requestFromDoc(d.id, d.data() as Record<string, unknown>)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listAllRequests(): Promise<FreeRequest[]> {
  const snap = await getDocs(query(collection(db, "requests"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => requestFromDoc(d.id, d.data() as Record<string, unknown>));
}

export async function listWatchedRequests(email: string): Promise<FreeRequest[]> {
  const snap = await getDocs(query(collection(db, "requests"), where("watcherEmails", "array-contains", email)));
  return snap.docs.map((d) => requestFromDoc(d.id, d.data() as Record<string, unknown>)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listRequestsForApprover(userId: string): Promise<FreeRequest[]> {
  const stepSnap = await getDocs(query(collection(db, "steps"), where("approverId", "==", userId)));
  const ids = [...new Set(stepSnap.docs.map((d) => String(d.data().requestId)))];
  const requests: FreeRequest[] = [];
  for (const id of ids) {
    const request = await getRequest(id);
    if (request) requests.push(request);
  }
  return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const listApprovalsForUser = listRequestsForApprover;

export async function listSteps(requestId: string): Promise<FreeStep[]> {
  const snap = await getDocs(query(collection(db, "steps"), where("requestId", "==", requestId)));
  return snap.docs.map((d) => stepFromDoc(d.id, d.data() as Record<string, unknown>)).sort((a, b) => a.sequence - b.sequence);
}

export async function listDocuments(requestId: string): Promise<FreeDocument[]> {
  const snap = await getDocs(query(collection(db, "documents"), where("requestId", "==", requestId)));
  return snap.docs.map((d) => documentFromDoc(d.id, d.data() as Record<string, unknown>)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listComments(requestId: string): Promise<FreeComment[]> {
  const snap = await getDocs(query(collection(db, "comments"), where("requestId", "==", requestId), limit(200)));
  return snap.docs.map((d) => ({
    id: d.id,
    requestId: String(d.data().requestId ?? ""),
    authorId: String(d.data().authorId ?? ""),
    authorName: String(d.data().authorName ?? ""),
    authorEmail: String(d.data().authorEmail ?? ""),
    message: String(d.data().message ?? ""),
    createdAt: String(d.data().createdAt ?? "")
  })).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addComment(user: AppUser, requestId: string, message: string): Promise<void> {
  await addDoc(collection(db, "comments"), {
    requestId,
    authorId: user.id,
    authorName: user.name,
    authorEmail: user.email,
    message,
    createdAt: nowIso()
  });
  await addAudit(user, "ADDED_COMMENT", "REQUEST", requestId, message);
}

export async function createDraft(user: AppUser, formData: Record<string, unknown>, hub: Hub): Promise<string> {
  const ref = await addDoc(collection(db, "requests"), {
    title: String(formData.title ?? "Untitled request"),
    requesterId: user.id,
    requesterName: user.name,
    requesterEmail: user.email,
    hubId: hub.id,
    hubName: hub.name,
    status: "DRAFT",
    cpoBudgetStatus: String(formData.cpoBudgetStatus ?? ""),
    requiredApproverCount: 0,
    formData,
    watcherEmails: Array.isArray(formData.watcherEmails) ? formData.watcherEmails : [],
    createdAt: nowIso(),
    submittedAt: null,
    completedAt: null,
    rejectionReason: null
  });
  return ref.id;
}

export async function updateDraft(requestId: string, formData: Record<string, unknown>, hub: Hub): Promise<void> {
  await updateDoc(doc(db, "requests", requestId), {
    title: String(formData.title ?? "Untitled request"),
    hubId: hub.id,
    hubName: hub.name,
    cpoBudgetStatus: String(formData.cpoBudgetStatus ?? ""),
    formData,
    watcherEmails: Array.isArray(formData.watcherEmails) ? formData.watcherEmails : []
  });
}

export async function submitRequest(user: AppUser, requestId: string): Promise<void> {
  const docSnap = await getDocs(query(collection(db, "documents"), where("requestId", "==", requestId)));
  const names = docSnap.docs.map((d) => String(d.data().documentName));
  const reqRef = doc(db, "requests", requestId);
  const preReq = await getDoc(reqRef);
  if (!preReq.exists()) throw new Error("Request not found");
  const preData = preReq.data() as Record<string, unknown>;
  if (preData.status !== "DRAFT") throw new Error("Only drafts can be submitted");
  for (const required of REQUIRED_DOCUMENT_TYPES) {
    if (!names.includes(required)) throw new Error(`Missing required document: ${required}`);
  }
  const routeSnap = await getDocs(query(collection(db, "hubs", String(preData.hubId), "routes"), orderBy("slot")));
  const routes = routeSnap.docs.map((d) => d.data() as Record<string, unknown>);
  const requiredCount = preData.cpoBudgetStatus === "ABOVE_CPO_BUDGET" ? 2 : 1;
  const approvers = routes.slice(0, requiredCount);
  if (approvers.length < requiredCount) throw new Error("Approver route is not configured for this hub");

  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists()) throw new Error("Request not found");
    const req = reqSnap.data() as Record<string, unknown>;
    if (req.status !== "DRAFT") throw new Error("Only drafts can be submitted");

    const counterRef = doc(db, "counters", "approvalRequests");
    const counterSnap = await tx.get(counterRef);
    const next = counterSnap.exists() ? Number(counterSnap.data().nextNumber ?? 0) + 1 : 1;
    tx.set(counterRef, { nextNumber: next });
    const requestNumber = `APR-${new Date().getFullYear()}-${String(next).padStart(6, "0")}`;

    approvers.forEach((route, index) => {
      const stepRef = doc(collection(db, "steps"));
      tx.set(stepRef, {
        requestId,
        sequence: index + 1,
        approverId: String(route.approverUserId ?? ""),
        approverName: String(route.approverName ?? ""),
        approverEmail: String(route.approverEmail ?? ""),
        status: index === 0 ? "ACTIVE" : "PENDING",
        activatedAt: index === 0 ? nowIso() : null,
        completedAt: null,
        comment: null,
        createdAt: nowIso()
      });
    });

    tx.update(reqRef, {
      status: "PENDING_APPROVAL",
      requestNumber,
      requiredApproverCount: requiredCount,
      submittedAt: nowIso()
    });
  });
}

export async function actOnStep(user: AppUser, stepId: string, action: "approve" | "reject" | "question", comment?: string): Promise<void> {
  const stepRef = doc(db, "steps", stepId);
  const stepSnap = await getDoc(stepRef);
  if (!stepSnap.exists()) throw new Error("Step not found");
  const step = stepSnap.data() as Record<string, unknown>;
  const nextQuery = query(collection(db, "steps"), where("requestId", "==", step.requestId), where("sequence", "==", Number(step.sequence) + 1), limit(1));
  const nextSnap = await getDocs(nextQuery);
  const nextRef = nextSnap.docs[0]?.ref ?? null;
  const reqRef = doc(db, "requests", String(step.requestId));

  await runTransaction(db, async (tx) => {
    const stepSnap = await tx.get(stepRef);
    if (!stepSnap.exists()) throw new Error("Step not found");
    const step = stepSnap.data() as Record<string, unknown>;
    if (String(step.approverId) !== user.id) throw new Error("This step is not assigned to you");
    if (step.status !== "ACTIVE") throw new Error("This step is not active");

    const now = nowIso();

    if (action === "approve") {
      tx.update(stepRef, { status: "APPROVED", completedAt: now, comment: comment ?? null });
      if (nextRef) {
        tx.update(nextRef, { status: "ACTIVE", activatedAt: now });
      } else {
        tx.update(reqRef, { status: "APPROVED", completedAt: now });
      }
    } else if (action === "reject") {
      tx.update(stepRef, { status: "REJECTED", completedAt: now, comment: comment ?? null });
      tx.update(reqRef, { status: "REJECTED", completedAt: now, rejectionReason: comment ?? "Rejected by approver" });
    } else {
      tx.update(stepRef, { status: "QUESTION_RAISED", comment: comment ?? "" });
      tx.update(reqRef, { status: "QUESTION_RAISED" });
    }
  });
}

export async function respondToQuestion(user: AppUser, requestId: string, answer: string): Promise<void> {
  const steps = await listSteps(requestId);
  const questionStep = steps.find((step) => step.status === "QUESTION_RAISED");
  if (!questionStep) throw new Error("No open question found");
  await updateDoc(doc(db, "steps", questionStep.id), { status: "ACTIVE", comment: null, activatedAt: nowIso() });
  await updateDoc(doc(db, "requests", requestId), { status: "PENDING_APPROVAL" });
  await addAudit(user, "RESPONDED_TO_QUESTION", "REQUEST", requestId, answer);
}

export async function withdrawRequest(user: AppUser, requestId: string, reason: string): Promise<void> {
  const request = await getRequest(requestId);
  if (!request || request.requesterId !== user.id) throw new Error("Not authorized");
  await updateDoc(doc(db, "requests", requestId), { status: "CANCELLED", completedAt: nowIso(), rejectionReason: reason });
}

export async function uploadDocumentFile(user: AppUser, requestId: string, file: File, documentName: string): Promise<void> {
  const downloadUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
  const existing = await listDocuments(requestId);
  await addDoc(collection(db, "documents"), {
    requestId,
    documentName,
    originalFilename: file.name,
    mimeType: file.type,
    size: file.size,
    versionNumber: existing.filter((d) => d.documentName === documentName).length + 1,
    uploadedBy: user.id,
    uploadedByName: user.name,
    storagePath: `documents/${requestId}/${Date.now()}-${file.name}`,
    downloadUrl,
    createdAt: nowIso()
  });
}

export async function addNotification(userId: string, title: string, message: string): Promise<void> {
  await addDoc(collection(db, "notifications"), { userId, title, message, read: false, createdAt: nowIso() });
}

export async function listNotifications(userId: string): Promise<FreeNotification[]> {
  const snap = await getDocs(query(collection(db, "notifications"), where("userId", "==", userId), limit(100)));
  return snap.docs.map((d) => ({
    id: d.id,
    userId: String(d.data().userId ?? ""),
    title: String(d.data().title ?? ""),
    message: String(d.data().message ?? ""),
    read: Boolean(d.data().read),
    createdAt: String(d.data().createdAt ?? "")
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markNotificationsRead(userId: string): Promise<void> {
  const notifications = await listNotifications(userId);
  await Promise.all(notifications.filter((n) => !n.read).map((n) => updateDoc(doc(db, "notifications", n.id), { read: true })));
}

export async function addAudit(actor: AppUser, action: string, entityType: string, entityId: string, details = ""): Promise<void> {
  await addDoc(collection(db, "auditLogs"), {
    actorId: actor.id,
    actorEmail: actor.email,
    action,
    entityType,
    entityId,
    details,
    createdAt: nowIso()
  });
}

export async function listAudit(): Promise<FreeAudit[]> {
  const snap = await getDocs(query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(200)));
  return snap.docs.map((d) => ({
    id: d.id,
    actorId: String(d.data().actorId ?? ""),
    actorEmail: String(d.data().actorEmail ?? ""),
    action: String(d.data().action ?? ""),
    entityType: String(d.data().entityType ?? ""),
    entityId: String(d.data().entityId ?? ""),
    details: String(d.data().details ?? ""),
    createdAt: String(d.data().createdAt ?? "")
  }));
}
