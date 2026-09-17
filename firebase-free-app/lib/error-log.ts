import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function logError(error: unknown, context = "app"): Promise<void> {
  try {
    await addDoc(collection(db, "errorLogs"), {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? "" : "",
      context,
      url: typeof window !== "undefined" ? window.location.href : "",
      createdAt: new Date().toISOString()
    });
  } catch {
    // Never let error logging break the app.
  }
}
