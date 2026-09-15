import type { Metadata } from "next";
import "@/app/globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "SPX Network Development App",
  description: "SPX Network Development HOD Approval Workflow"
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
