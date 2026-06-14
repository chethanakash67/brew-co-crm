import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Brew & Co. CRM",
  description: "AI-native Mini CRM for Brew & Co."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site-atmosphere min-h-screen">
          <Sidebar />
          <main className="relative z-10 min-h-screen px-4 py-5 md:ml-64 md:px-8 lg:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
