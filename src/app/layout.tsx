import "./globals.css";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { SideNav } from "@/components/SideNav";

export const metadata: Metadata = {
  title: "SLS-V2",
  description: "Internal SLS 3D printing file management",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [me, users] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <TopBar me={me} users={users} />
          <div className="flex flex-1">
            <SideNav />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
