"use client";

import React from "react";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "@/context/AuthContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const pathname = usePathname();

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/" ||
    pathname === "/reset-password";

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="min-h-screen w-full">{children}</div>
      </main>
    </div>
  );
}
