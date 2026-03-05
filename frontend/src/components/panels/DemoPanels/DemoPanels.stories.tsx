import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { PanelProvider, usePanels } from '@/contexts/PanelContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Panel1Content } from './DemoPanels';

const meta: Meta = {
  title: 'Panels/DemoPanels',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Interactive panel system demonstrations. Shows stacking panels, left/right alignment, full-width panels, and panels with action header buttons.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <PanelProvider>
            <div style={{ height: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Story />
            </div>
          </PanelProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;

function OpenPanelButton() {
  const { openPanel } = usePanels();
  return (
    <button
      onClick={() => openPanel('demo-panel', <Panel1Content />, 'Demo Panel', 'right', 'Explore panel features')}
      style={{
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #f97316, #ef4444)',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 15,
        fontWeight: 600,
      }}
    >
      <i className="fas fa-layer-group" style={{ marginRight: 8 }} />
      Open Demo Panel
    </button>
  );
}

export const Default: StoryObj = {
  render: () => <OpenPanelButton />,
  parameters: {
    docs: { description: { story: 'Click the button to open the interactive panel demo with stacking, alignment, and action buttons.' } },
  },
};

