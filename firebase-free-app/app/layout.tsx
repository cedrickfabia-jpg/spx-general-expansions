import type { Metadata } from "next";
import "@/app/globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "General Expansions | HOD Approval Workflow",
  description: "HOD Approval Workflow for General Expansions"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
