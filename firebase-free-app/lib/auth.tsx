"use client";

import * as React from "react";
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, RoleName } from "@/features/hod-approvals/types";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInDemo: (email: string, name: string, roles: RoleName[]) => Promise<void>;
  signInAs: (email: string, name?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);
const ADMIN_EMAIL = "cedrick.fabia@spxexpress.com";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function loadOrCreateProfile(uid: string, email: string, name: string, preferredRoles?: RoleName[]): Promise<AppUser> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data() as Partial<AppUser>) : null;
  const normalizedEmail = normalizeEmail(email);
  let profileSource = existing;
  if (!existing) {
    const byEmail = await getDocs(query(collection(db, "users"), where("email", "==", normalizedEmail), limit(1)));
    if (byEmail.docs.length > 0) {
      const data = byEmail.docs[0].data() as Partial<AppUser>;
      profileSource = { ...data, id: byEmail.docs[0].id };
    }
  }
  const defaultRoles: RoleName[] = normalizedEmail.endsWith("@spxexpress.com") ? ["WATCHER"] : ["REQUESTER"];
  let roles = profileSource?.roles?.length ? profileSource.roles : (preferredRoles ?? defaultRoles);
  if (normalizedEmail === ADMIN_EMAIL && !roles.includes("ADMINISTRATOR")) {
    roles = [...new Set([...roles, "ADMINISTRATOR" as RoleName, "HOD_APPROVER" as RoleName])] as RoleName[];
  }
  const profile: AppUser = {
    id: uid,
    googleId: existing?.googleId ?? null,
    email: profileSource?.email ?? normalizedEmail,
    name: profileSource?.name ?? name,
    profilePicture: profileSource?.profilePicture ?? null,
    active: profileSource?.active ?? true,
    roles,
    isAdmin: roles.includes("ADMINISTRATOR"),
    workflowAccess: profileSource?.workflowAccess ?? (roles.includes("ADMINISTRATOR")
      ? { "hod-approval": ["ADMINISTRATOR", "HOD_1", "HOD_2", "REQUESTER", "WATCHER"] }
      : { "hod-approval": ["WATCHER"] })
  };
  await setDoc(ref, profile, { merge: true });
  return profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const profile = await loadOrCreateProfile(
          firebaseUser.uid,
          firebaseUser.email ?? `${firebaseUser.uid}@spxexpress.com`,
          firebaseUser.displayName ?? "Anonymous User"
        );
        setUser(profile);
      } catch (error) {
        console.error("Failed to load user profile", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email ?? "";
    if (!email.endsWith("@spxexpress.com")) {
      await signOut(auth);
      throw new Error("Only @spxexpress.com accounts can access this application.");
    }
    await loadOrCreateProfile(result.user.uid, email, result.user.displayName ?? email);
  }

  async function signInDemo(email: string, name: string, roles: RoleName[]) {
    const result = await signInAnonymously(auth);
    await loadOrCreateProfile(result.user.uid, email, name, roles);
  }

  async function signInAs(email: string, name?: string) {
    const result = await signInAnonymously(auth);
    await loadOrCreateProfile(result.user.uid, email, name ?? email);
  }

  async function signOutUser() {
    await signOut(auth);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInDemo, signInAs, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
