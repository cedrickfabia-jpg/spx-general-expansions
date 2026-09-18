import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
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
import { requiredApproverCount } from "@/lib/workflow-rules";

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
  workflowId: string;
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

export interface FreeErrorLog {
  id: string;
  message: string;
  stack: string;
  context: string;
  url: string;
  createdAt: string;
}

export interface AppSettings {
  appName: string;
  appUrl: string;
  retentionMonths: number;
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

export interface FreeRevision {
  id: string;
  requestId: string;
  versionNumber: number;
  createdBy: string;
  createdByName: string;
  reason: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface FreeAction {
  id: string;
  requestId: string;
  stepId?: string | null;
  actorId: string;
  actorName: string;
  actorEmail: string;
  action: string;
  comment?: string | null;
  createdAt: string;
}

const nowIso = () => new Date().toISOString();

function requestFromDoc(id: string, data: Record<string, unknown>): FreeRequest {
  return {
    id,
    workflowId: String(data.workflowId ?? "hod-approval"),
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
    isAdmin: ((d.data().roles as RoleName[]) ?? []).includes("ADMINISTRATOR"),
    workflowAccess: (d.data().workflowAccess as Record<string, string[]> | undefined) ?? {}
  }));
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const snap = await getDocs(query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()), limit(1)));
  if (snap.docs.length === 0) return null;
  const data = snap.docs[0].data() as Partial<AppUser>;
  const roles = data.roles ?? [];
  return {
    id: snap.docs[0].id,
    googleId: data.googleId ?? null,
    email: data.email ?? email,
    name: data.name ?? email,
    profilePicture: data.profilePicture ?? null,
    active: data.active ?? true,
    roles,
    isAdmin: roles.includes("ADMINISTRATOR"),
    workflowAccess: (data.workflowAccess as Record<string, string[]> | undefined) ?? {}
  };
}

export async function createUserProfile(email: string, name: string, roles: RoleName[]): Promise<string> {
  const existing = await findUserByEmail(email);
  const profile = { email: email.trim().toLowerCase(), name, roles, isAdmin: roles.includes("ADMINISTRATOR"), active: true, googleId: null, profilePicture: null, createdAt: nowIso(), updatedAt: nowIso() };
  if (existing) {
    await updateDoc(doc(db, "users", existing.id), profile);
    return existing.id;
  }
  // Keyed by email (not a random id) so the security rules can recognize this
  // placeholder by a direct lookup when the person signs in for the first time.
  const emailId = profile.email;
  await setDoc(doc(db, "users", emailId), profile);
  return emailId;
}

export async function setUserRoles(uid: string, roles: RoleName[]): Promise<void> {
  await updateDoc(doc(db, "users", uid), { roles, isAdmin: roles.includes("ADMINISTRATOR") });
}

export async function setUserActive(uid: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid), { active });
}

export async function updateUserName(uid: string, name: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { name });
}

export async function updateUserPreferences(uid: string, preferences: Record<string, unknown>): Promise<void> {
  await updateDoc(doc(db, "users", uid), { preferences });
}

export async function acknowledgeCompliance(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { complianceAcknowledged: true, complianceAcknowledgedAt: new Date().toISOString() });
}

export const WORKFLOW_ACCESS_TYPES = [
  { id: "ADMINISTRATOR", label: "Administrator view" },
  { id: "REQUESTER", label: "Requester view" },
  { id: "HOD_1", label: "HOD 1" },
  { id: "HOD_2", label: "HOD 2" },
  { id: "WATCHER", label: "Watcher view" }
] as const;

export async function updateWorkflowAccess(uid: string, workflowId: string, accessTypes: string[]): Promise<void> {
  const userSnap = await getDoc(doc(db, "users", uid));
  let workflowAccess: Record<string, string[]> = {};
  if (userSnap.exists()) {
    const existing = (userSnap.data() as Partial<AppUser>).workflowAccess;
    if (existing) workflowAccess = existing;
  }
  workflowAccess[workflowId] = accessTypes;
  await updateDoc(doc(db, "users", uid), { workflowAccess });
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

export function subscribeMyRequests(userId: string, callback: (requests: FreeRequest[]) => void): () => void {
  const q = query(collection(db, "requests"), where("requesterId", "==", userId));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => requestFromDoc(d.id, d.data() as Record<string, unknown>)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
}

export function subscribeWatchedRequests(email: string, callback: (requests: FreeRequest[]) => void): () => void {
  const q = query(collection(db, "requests"), where("watcherEmails", "array-contains", email));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => requestFromDoc(d.id, d.data() as Record<string, unknown>)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
}

export function subscribeAllRequests(callback: (requests: FreeRequest[]) => void): () => void {
  const q = query(collection(db, "requests"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => requestFromDoc(d.id, d.data() as Record<string, unknown>))));
}

export function subscribeNotifications(userId: string, callback: (notifications: FreeNotification[]) => void): () => void {
  const q = query(collection(db, "notifications"), where("userId", "==", userId), limit(100));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({
    id: d.id,
    userId: String(d.data().userId ?? ""),
    title: String(d.data().title ?? ""),
    message: String(d.data().message ?? ""),
    read: Boolean(d.data().read),
    createdAt: String(d.data().createdAt ?? "")
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
}

export function subscribeRequest(id: string, callback: (request: FreeRequest | null) => void): () => void {
  return onSnapshot(doc(db, "requests", id), (snap) => callback(snap.exists() ? requestFromDoc(snap.id, snap.data() as Record<string, unknown>) : null));
}

export function subscribeSteps(requestId: string, callback: (steps: FreeStep[]) => void): () => void {
  const q = query(collection(db, "steps"), where("requestId", "==", requestId));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => stepFromDoc(d.id, d.data() as Record<string, unknown>)).sort((a, b) => a.sequence - b.sequence)));
}

export function subscribeDocuments(requestId: string, callback: (documents: FreeDocument[]) => void): () => void {
  const q = query(collection(db, "documents"), where("requestId", "==", requestId));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => documentFromDoc(d.id, d.data() as Record<string, unknown>)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))));
}

export function subscribeComments(requestId: string, callback: (comments: FreeComment[]) => void): () => void {
  const q = query(collection(db, "comments"), where("requestId", "==", requestId), limit(200));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({
    id: d.id,
    requestId: String(d.data().requestId ?? ""),
    authorId: String(d.data().authorId ?? ""),
    authorName: String(d.data().authorName ?? ""),
    authorEmail: String(d.data().authorEmail ?? ""),
    message: String(d.data().message ?? ""),
    createdAt: String(d.data().createdAt ?? "")
  })).sort((a, b) => a.createdAt.localeCompare(b.createdAt))));
}

export function subscribeRevisions(requestId: string, callback: (revisions: FreeRevision[]) => void): () => void {
  const q = query(collection(db, "requestRevisions"), where("requestId", "==", requestId), limit(200));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({
    id: d.id,
    requestId: String(d.data().requestId ?? ""),
    versionNumber: Number(d.data().versionNumber ?? 1),
    createdBy: String(d.data().createdBy ?? ""),
    createdByName: String(d.data().createdByName ?? ""),
    reason: String(d.data().reason ?? ""),
    data: (d.data().data as Record<string, unknown>) ?? {},
    createdAt: String(d.data().createdAt ?? "")
  })).sort((a, b) => a.versionNumber - b.versionNumber)));
}

export function subscribeActions(requestId: string, callback: (actions: FreeAction[]) => void): () => void {
  const q = query(collection(db, "actions"), where("requestId", "==", requestId), limit(200));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({
    id: d.id,
    requestId: String(d.data().requestId ?? ""),
    stepId: d.data().stepId ? String(d.data().stepId) : null,
    actorId: String(d.data().actorId ?? ""),
    actorName: String(d.data().actorName ?? ""),
    actorEmail: String(d.data().actorEmail ?? ""),
    action: String(d.data().action ?? ""),
    comment: d.data().comment ? String(d.data().comment) : null,
    createdAt: String(d.data().createdAt ?? "")
  })).sort((a, b) => a.createdAt.localeCompare(b.createdAt))));
}

export function subscribeApproverRequestIds(userId: string, callback: (requestIds: string[]) => void): () => void {
  const q = query(collection(db, "steps"), where("approverId", "==", userId));
  return onSnapshot(q, (snap) => callback([...new Set(snap.docs.map((d) => String(d.data().requestId)).filter(Boolean))]));
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

export async function listReplaceableSteps(): Promise<Array<{ step: FreeStep; requestId: string; requestTitle: string }>> {
  const snap = await getDocs(query(collection(db, "steps"), where("status", "in", ["ACTIVE", "QUESTION_RAISED"]), limit(200)));
  const items: Array<{ step: FreeStep; requestId: string; requestTitle: string }> = [];
  for (const docSnap of snap.docs) {
    const step = stepFromDoc(docSnap.id, docSnap.data() as Record<string, unknown>);
    const request = await getRequest(step.requestId);
    items.push({ step, requestId: step.requestId, requestTitle: request?.title ?? step.requestId });
  }
  return items;
}

export async function replaceApprover(user: AppUser, stepId: string, newApproverId: string, newApproverName: string, newApproverEmail: string): Promise<void> {
  const stepRef = doc(db, "steps", stepId);
  const stepSnap = await getDoc(stepRef);
  if (!stepSnap.exists()) throw new Error("Step not found");
  const step = stepSnap.data() as Record<string, unknown>;
  await updateDoc(stepRef, { approverId: newApproverId, approverName: newApproverName, approverEmail: newApproverEmail });
  await addAction(user, String(step.requestId), "APPROVER_REPLACED", `Assigned to ${newApproverName} (${newApproverEmail})`, stepId);
  await addAudit(user, "APPROVER_REPLACED", "REQUEST", String(step.requestId), `${newApproverName} (${newApproverEmail})`);
  const request = await getRequest(String(step.requestId));
  if (request) await addNotification(newApproverId, "Approval reassigned to you", `You are now the assigned approver for ${request.title}.`);
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
  await addAction(user, requestId, "COMMENT", message);
}

export async function addRevision(user: AppUser, requestId: string, reason: string, data: Record<string, unknown>): Promise<void> {
  const revisions = await listRevisions(requestId);
  const versionNumber = revisions.length > 0 ? Math.max(...revisions.map((revision) => revision.versionNumber)) + 1 : 1;
  await addDoc(collection(db, "requestRevisions"), {
    requestId,
    versionNumber,
    createdBy: user.id,
    createdByName: user.name,
    reason,
    data,
    createdAt: nowIso()
  });
  await addAudit(user, "REQUEST_REVISION_CREATED", "REQUEST_REVISIONS", requestId, `Version ${versionNumber}: ${reason}`);
}

export async function listRevisions(requestId: string): Promise<FreeRevision[]> {
  const snap = await getDocs(query(collection(db, "requestRevisions"), where("requestId", "==", requestId), limit(200)));
  return snap.docs.map((d) => ({
    id: d.id,
    requestId: String(d.data().requestId ?? ""),
    versionNumber: Number(d.data().versionNumber ?? 1),
    createdBy: String(d.data().createdBy ?? ""),
    createdByName: String(d.data().createdByName ?? ""),
    reason: String(d.data().reason ?? ""),
    data: (d.data().data as Record<string, unknown>) ?? {},
    createdAt: String(d.data().createdAt ?? "")
  })).sort((a, b) => a.versionNumber - b.versionNumber);
}

export async function addAction(user: AppUser, requestId: string, action: string, comment?: string, stepId?: string): Promise<void> {
  await addDoc(collection(db, "actions"), {
    requestId,
    stepId: stepId ?? null,
    actorId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    action,
    comment: comment ?? null,
    createdAt: nowIso()
  });
}

export async function listActions(requestId: string): Promise<FreeAction[]> {
  const snap = await getDocs(query(collection(db, "actions"), where("requestId", "==", requestId), limit(200)));
  return snap.docs.map((d) => ({
    id: d.id,
    requestId: String(d.data().requestId ?? ""),
    stepId: d.data().stepId ? String(d.data().stepId) : null,
    actorId: String(d.data().actorId ?? ""),
    actorName: String(d.data().actorName ?? ""),
    actorEmail: String(d.data().actorEmail ?? ""),
    action: String(d.data().action ?? ""),
    comment: d.data().comment ? String(d.data().comment) : null,
    createdAt: String(d.data().createdAt ?? "")
  })).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createDraft(user: AppUser, formData: Record<string, unknown>, hub: Hub): Promise<string> {
  const ref = await addDoc(collection(db, "requests"), {
    workflowId: "hod-approval",
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
    approverUserIds: [],
    watcherUserIds: [],
    createdAt: nowIso(),
    submittedAt: null,
    completedAt: null,
    rejectionReason: null
  });
  return ref.id;
}

export async function updateDraft(requestId: string, formData: Record<string, unknown>, hub: Hub): Promise<void> {
  const request = await getRequest(requestId);
  if (request) {
    const user = await getUserProfile(String(request.requesterId));
    if (user) await addRevision(user, requestId, "Draft update", formData);
  }
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
  const requiredCount = requiredApproverCount(String(preData.cpoBudgetStatus ?? ""));
  const hod1Snap = await getDocs(query(collection(db, "users"), where("roles", "array-contains", "HOD_1"), limit(1)));
  if (hod1Snap.docs.length === 0) throw new Error("No account assigned to HOD 1");
  const hod1 = hod1Snap.docs[0].data();
  const approvers = [{
    approverUserId: hod1Snap.docs[0].id,
    approverName: String(hod1.name ?? ""),
    approverEmail: String(hod1.email ?? "")
  }];
  if (requiredCount === 2) {
    const hod2Snap = await getDocs(query(collection(db, "users"), where("roles", "array-contains", "HOD_2"), limit(1)));
    if (hod2Snap.docs.length === 0) throw new Error("No account assigned to HOD 2");
    const hod2 = hod2Snap.docs[0].data();
    approvers.push({
      approverUserId: hod2Snap.docs[0].id,
      approverName: String(hod2.name ?? ""),
      approverEmail: String(hod2.email ?? "")
    });
  }
  const watcherUserIds: string[] = [];
  for (const watcherEmail of Array.isArray(preData.watcherEmails) ? preData.watcherEmails.map(String) : []) {
    const watcher = await findUserByEmail(watcherEmail);
    if (watcher) watcherUserIds.push(watcher.id);
  }

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
      approverUserIds: approvers.map((route) => String(route.approverUserId ?? "")),
      watcherUserIds,
      submittedAt: nowIso()
    });
  });
  await addAction(user, requestId, "SUBMITTED");
  await addAudit(user, "REQUEST_SUBMITTED", "REQUEST", requestId, requestId);
  for (const approver of approvers) {
    await addNotification(String(approver.approverUserId), "New approval request", `A request was submitted and assigned to you for HOD approval.`);
  }
  for (const watcherEmail of Array.isArray(preData.watcherEmails) ? preData.watcherEmails.map(String) : []) {
    const watcher = await findUserByEmail(watcherEmail);
    if (watcher) await addNotification(watcher.id, "You were tagged in an HOD Approval", `A request has been submitted and you are listed as a watcher.`);
  }
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
  const actionLabel = action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "QUESTION_RAISED";
  await addAction(user, String(step.requestId), actionLabel, comment, stepId);
  await addAudit(user, actionLabel, "REQUEST", String(step.requestId), comment ?? "");
  const request = await getRequest(String(step.requestId));
  if (request) {
    await addNotification(request.requesterId, `${actionLabel} on ${request.title}`, comment ?? `The request was ${actionLabel.toLowerCase().replace(/_/g, " ")}.`);
  }
}

export async function respondToQuestion(user: AppUser, requestId: string, answer: string): Promise<void> {
  const steps = await listSteps(requestId);
  const questionStep = steps.find((step) => step.status === "QUESTION_RAISED");
  if (!questionStep) throw new Error("No open question found");
  await updateDoc(doc(db, "steps", questionStep.id), { status: "ACTIVE", comment: null, activatedAt: nowIso() });
  await updateDoc(doc(db, "requests", requestId), { status: "PENDING_APPROVAL" });
  await addRevision(user, requestId, "Response to question", { answer });
  await addAction(user, requestId, "RESPONDED_TO_QUESTION", answer);
  await addAudit(user, "RESPONDED_TO_QUESTION", "REQUEST", requestId, answer);
}

export async function withdrawRequest(user: AppUser, requestId: string, reason: string): Promise<void> {
  const request = await getRequest(requestId);
  if (!request || request.requesterId !== user.id) throw new Error("Not authorized");
  await updateDoc(doc(db, "requests", requestId), { status: "CANCELLED", completedAt: nowIso(), rejectionReason: reason });
  await addAction(user, requestId, "WITHDRAWN", reason);
  await addAudit(user, "WITHDRAWN", "REQUEST", requestId, reason);
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

export async function listErrorLogs(): Promise<FreeErrorLog[]> {
  const snap = await getDocs(query(collection(db, "errorLogs"), limit(200)));
  return snap.docs.map((d) => ({
    id: d.id,
    message: String(d.data().message ?? ""),
    stack: String(d.data().stack ?? ""),
    context: String(d.data().context ?? ""),
    url: String(d.data().url ?? ""),
    createdAt: String(d.data().createdAt ?? "")
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSettings(): Promise<AppSettings> {
  const snap = await getDoc(doc(db, "settings", "app"));
  if (!snap.exists()) {
    return { appName: "SPX Network Development App", appUrl: "https://spx-netdev.web.app", retentionMonths: 6 };
  }
  const data = snap.data() as Partial<AppSettings>;
  return {
    appName: data.appName ?? "SPX Network Development App",
    appUrl: data.appUrl ?? "https://spx-netdev.web.app",
    retentionMonths: Number(data.retentionMonths ?? 6)
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await setDoc(doc(db, "settings", "app"), settings);
}
