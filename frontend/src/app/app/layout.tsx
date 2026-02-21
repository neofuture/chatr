"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import MobileLayout from "@/components/MobileLayout/MobileLayout";
import { usePanels } from "@/contexts/PanelContext";
import { Panel1Content } from "@/components/panels/DemoPanels/DemoPanels";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { openPanel } = usePanels();

  const openDemoPanel = () => {
    openPanel("Panel Demo", <Panel1Content />);
  };

  useEffect(() => {
    // Apply fixed height only to app pages
    document.documentElement.style.height = "100%";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";

    // Cleanup when leaving app pages
    return () => {
      document.documentElement.style.height = "";
      document.documentElement.style.overflow = "";
      document.body.style.height = "";
      document.body.style.overflow = "";
    };
  }, []);

  // Determine title and header action based on path
  let title = "Chats";
  let headerAction;

  if (pathname === "/app/groups") {
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
      onClick: () => alert("New Chat clicked!"),
    };
  }

  return (
    <MobileLayout
      title={title}
      onPanelDemo={openDemoPanel}
      headerAction={headerAction}
    >
      {children}
    </MobileLayout>
  );
}
