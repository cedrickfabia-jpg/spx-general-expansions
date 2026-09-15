import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "General Expansions | HOD Approval Workflow",
    template: "%s | General Expansions"
  },
  description: "HOD Approval Workflow for General Expansions"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
