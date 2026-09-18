"use client";

import * as React from "react";
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, RoleName } from "@/features/hod-approvals/types";
import { APPROVED_EMAILS } from "@/lib/approved-emails";

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
  const isApproved = normalizedEmail === ADMIN_EMAIL || APPROVED_EMAILS.includes(normalizedEmail);
  if (!profileSource && !preferredRoles && !isApproved) {
    throw new Error("Your account has not been granted access. Please contact the administrator.");
  }
  const defaultRoles: RoleName[] = ["WATCHER"];
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
    active: normalizedEmail === ADMIN_EMAIL ? true : (profileSource?.active ?? true),
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
  const currentRolesRef = React.useRef<string[] | null>(null);

  React.useEffect(() => {
    async function checkForRoleChanges() {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || !currentRolesRef.current) return;
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!snap.exists()) return;
      const roles = (snap.data() as Partial<AppUser>).roles ?? [];
      if (JSON.stringify(roles) !== JSON.stringify(currentRolesRef.current)) {
        await signOut(auth);
        currentRolesRef.current = null;
      }
    }
    const onVisible = () => { if (!document.hidden) void checkForRoleChanges(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => void checkForRoleChanges(), 60000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    let timer: number | undefined;
    const resetTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (auth.currentUser) {
          await signOut(auth);
          currentRolesRef.current = null;
        }
      }, 30 * 60 * 1000);
    };
    const events = ["mousemove", "keydown", "click", "scroll"] as const;
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer));
    resetTimer();
    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, []);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        currentRolesRef.current = null;
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
        if (!profile.active) {
          await signOut(auth);
          currentRolesRef.current = null;
          setUser(null);
          setLoading(false);
          return;
        }
        currentRolesRef.current = profile.roles;
        setUser(profile);
      } catch (error) {
        console.error("Failed to load user profile", error);
        await signOut(auth).catch(() => {});
        currentRolesRef.current = null;
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
    try {
      await loadOrCreateProfile(result.user.uid, email, result.user.displayName ?? email);
    } catch (err) {
      await signOut(auth);
      throw err;
    }
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
