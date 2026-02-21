'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type ConfirmationUrgency = 'info' | 'warning' | 'danger';

export interface ConfirmationAction {
  label: string;
  variant?: 'primary' | 'destructive' | 'secondary';
  value: any;
}

export interface ConfirmationConfig {
  title: string;
  message: string;
  actions: ConfirmationAction[];
  urgency?: ConfirmationUrgency;
}

interface ConfirmationState extends ConfirmationConfig {
  id: string;
  isOpen: boolean;
  resolve: (value: any) => void;
}

interface ConfirmationContextType {
  showConfirmation: (config: ConfirmationConfig) => Promise<any>;
  currentConfirmation: ConfirmationState | null;
  closeConfirmation: (value?: any) => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [currentConfirmation, setCurrentConfirmation] = useState<ConfirmationState | null>(null);

  const showConfirmation = (config: ConfirmationConfig): Promise<any> => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substr(2, 9);
      setCurrentConfirmation({
        ...config,
        id,
        isOpen: true,
        resolve,
      });
    });
  };

  const closeConfirmation = (value?: any) => {
    if (currentConfirmation) {
      currentConfirmation.resolve(value);
      setCurrentConfirmation(null);
    }
  };

  return (
    <ConfirmationContext.Provider
      value={{
        showConfirmation,
        currentConfirmation,
        closeConfirmation,
      }}
    >
      {children}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within ConfirmationProvider');
  }
  return context;
}

