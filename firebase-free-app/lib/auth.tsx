"use client";

import * as React from "react";
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, RoleName } from "@/features/hod-approvals/types";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInDemo: (email: string, name: string, roles: RoleName[]) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function loadOrCreateProfile(uid: string, email: string, name: string, preferredRoles?: RoleName[]): Promise<AppUser> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data() as Partial<AppUser>) : null;
  const roles = existing?.roles?.length ? existing.roles : (preferredRoles ?? ["REQUESTER"]);
  const profile: AppUser = {
    id: uid,
    googleId: existing?.googleId ?? null,
    email: existing?.email ?? normalizeEmail(email),
    name: existing?.name ?? name,
    profilePicture: existing?.profilePicture ?? null,
    active: existing?.active ?? true,
    roles,
    isAdmin: roles.includes("ADMINISTRATOR")
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

  async function signOutUser() {
    await signOut(auth);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInDemo, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
