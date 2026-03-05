"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import MobileLayout from "@/components/MobileLayout/MobileLayout";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // ...existing code...
  }, []);

  // Determine title and header action based on path
  let title = "Chats";
  let headerAction;

  if (pathname === "/app/friends") {
    title = "Friends";
  } else if (pathname === "/app/groups") {
    title = "Groups";
  } else if (pathname === "/app/updates") {
    title = "Updates";
  } else if (pathname === "/app/test") {
    title = "Test Lab";
  } else if (pathname === "/app/settings") {
    title = "Settings";
  } else {
    // Chats page (default)
    headerAction = {
      icon: "far fa-pen-to-square",
      onClick: () => window.dispatchEvent(new CustomEvent('chatr:compose')),
    };
  }

  return (
    <MobileLayout
      title={title}
      headerAction={headerAction}
    >
      {children}
    </MobileLayout>
  );
}
