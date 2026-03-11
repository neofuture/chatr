'use client';

import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';

export interface ActionSubmenuItem {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export interface ActionIcon {
  icon: string;
  onClick: () => void;
  label?: string;
  /** When set, clicking the button opens a dropdown with these items instead of calling onClick */
  submenu?: ActionSubmenuItem[];
}

interface Panel {
  id: string;
  title: string;
  component: ReactNode;
  footer?: () => ReactNode;
  level: number;
  isClosing?: boolean;
  titlePosition?: 'center' | 'left' | 'right';
  subTitle?: string;
  profileImage?: string;
  fullWidth?: boolean;
  actionIcons?: ActionIcon[];
  isGuest?: boolean;
}

interface PanelContextType {
  panels: Panel[];
  openPanel: (id: string, component: ReactNode, title?: string, titlePosition?: 'center' | 'left' | 'right', subTitle?: string, profileImage?: string, fullWidth?: boolean, actionIcons?: ActionIcon[], footer?: () => ReactNode, isGuest?: boolean) => void;
  /** Patch only the actionIcons of an existing panel — does NOT re-mount its component */
  updatePanelActionIcons: (id: string, actionIcons: ActionIcon[] | undefined) => void;
  /** Patch title (and optionally subtitle / profileImage) of an existing panel */
  updatePanelMeta: (id: string, meta: { title?: string; subTitle?: string; profileImage?: string | null }) => void;
  closePanel: (id: string) => void;
  closeTopPanel: () => void;
  closeAllPanels: () => void;
  maxLevel: number;
  effectiveMaxLevel: number; // Max level excluding closing panels
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

export function PanelProvider({ children }: { children: ReactNode }) {
  const [panels, setPanels] = useState<Panel[]>([]);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  const maxLevel = panels.length > 0 ? Math.max(...panels.map(p => p.level)) : -1;

  // Effective max level excludes panels that are closing
  const nonClosingPanels = panels.filter(p => !p.isClosing);
  const effectiveMaxLevel = nonClosingPanels.length > 0
    ? Math.max(...nonClosingPanels.map(p => p.level))
    : -1;

  const openPanel = (id: string, component: ReactNode, title?: string, titlePosition: 'center' | 'left' | 'right' = 'center', subTitle?: string, profileImage?: string, fullWidth?: boolean, actionIcons?: ActionIcon[], footer?: () => ReactNode, isGuest?: boolean) => {
    setPanels((prev) => {
      // Check if panel already exists
      const existsIndex = prev.findIndex((p) => p.id === id);

      if (existsIndex !== -1) {
        // Update existing panel
        const newPanels = [...prev];
        newPanels[existsIndex] = {
          ...newPanels[existsIndex],
          title: title || id,
          component,
          titlePosition,
          subTitle,
          profileImage,
          fullWidth,
          actionIcons,
          footer,
          isGuest,
          // Don't update id or level
        };
        return newPanels;
      }

      // Add new panel at next level
      const nextLevel = prev.length > 0 ? Math.max(...prev.map((p) => p.level)) + 1 : 0;
      return [...prev, {
        id,
        title: title || id,
        component,
        level: nextLevel,
        titlePosition,
        subTitle,
        profileImage,
        fullWidth,
        actionIcons,
        footer,
        isGuest,
      }];
    });
  };

  const updatePanelActionIcons = (id: string, actionIcons: ActionIcon[] | undefined) => {
    setPanels((prev) => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], actionIcons };
      return next;
    });
  };

  const updatePanelMeta = (id: string, meta: { title?: string; subTitle?: string; profileImage?: string | null }) => {
    setPanels((prev) => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        ...(meta.title !== undefined && { title: meta.title }),
        ...(meta.subTitle !== undefined && { subTitle: meta.subTitle }),
        ...(meta.profileImage !== undefined && { profileImage: meta.profileImage ?? undefined }),
      };
      return next;
    });
  };

  const closePanel = (id: string) => {
    setPanels((prev) => {
      const panel = prev.find((p) => p.id === id);
      if (!panel) return prev;

      // Mark the panel and all panels above it as closing
      return prev.map(p =>
        p.level >= panel.level ? { ...p, isClosing: true } : p
      );
    });

    // Remove the panels after animation completes
    safeTimeout(() => {
      setPanels((prev) => {
        const panel = prev.find((p) => p.id === id);
        if (!panel) return prev;
        return prev.filter((p) => p.level < panel.level);
      });
    }, 300);
  };

  const closeTopPanel = () => {
    setPanels((prev) => {
      if (prev.length === 0) return prev;
      const maxLvl = Math.max(...prev.map((p) => p.level));

      // Mark the top panel as closing
      return prev.map(p =>
        p.level === maxLvl ? { ...p, isClosing: true } : p
      );
    });

    // Remove the top panel after animation completes
    safeTimeout(() => {
      setPanels((prev) => {
        if (prev.length === 0) return prev;
        const maxLvl = Math.max(...prev.map((p) => p.level));
        return prev.filter((p) => p.level < maxLvl);
      });
    }, 300);
  };

  const closeAllPanels = () => {
    if (panels.length === 0) return;

    // Mark all panels as closing
    setPanels(prev => prev.map(p => ({ ...p, isClosing: true })));

    // Remove all panels after animation completes
    safeTimeout(() => {
      setPanels([]);
    }, 300);
  };

  return (
    <PanelContext.Provider value={{ panels, openPanel, updatePanelActionIcons, updatePanelMeta, closePanel, closeTopPanel, closeAllPanels, maxLevel, effectiveMaxLevel }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanels() {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error('usePanels must be used within a PanelProvider');
  }
  return context;
}
