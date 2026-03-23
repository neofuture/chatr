import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { UserSettingsProvider } from '@/contexts/UserSettingsContext';
import { LogProvider } from '@/contexts/LogContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { ToastProvider } from '@/contexts/ToastContext';
import SettingsPanel from './SettingsPanel';

const meta: Meta<typeof SettingsPanel> = {
  title: 'Settings/SettingsPanel',
  component: SettingsPanel,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Main settings panel with theme toggle, notification preferences, and navigation to sub-panels.' } },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <WebSocketProvider>
            <PresenceProvider>
              <PanelProvider>
                <UserSettingsProvider>
                  <LogProvider>
                    <div style={{ width: 380, height: 700, background: '#0f172a' }}>
                      <Story />
                    </div>
                  </LogProvider>
                </UserSettingsProvider>
              </PanelProvider>
            </PresenceProvider>
          </WebSocketProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SettingsPanel>;

export const Default: Story = {};
