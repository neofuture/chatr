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
  let headerAction: { icon: string; onClick: () => void; title?: string; color?: string } | { icon: string; onClick: () => void; title?: string; color?: string }[] | undefined;

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
    // Chats page — compose + create group
    headerAction = [
      {
        icon: "fad fa-users",
        badge: "+",
        title: "Create new group",
        color: "#ffffff",
        onClick: () => window.dispatchEvent(new CustomEvent('chatr:new-group')),
      },
      {
        icon: "far fa-pen-to-square",
        title: "New message",
        onClick: () => window.dispatchEvent(new CustomEvent('chatr:compose')),
      },
    ];
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
