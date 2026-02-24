import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import BottomSheet from './BottomSheet';
import Button from '@/components/form-controls/Button/Button';

const meta: Meta = {
  title: 'Dialogs/BottomSheet',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Mobile-style sheet that slides up from the bottom. Supports full-height, fixed-height, and auto-height modes.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

function BottomSheetDemo({
  heightMode = 'fixed',
  fixedHeight = '40vh',
  showCloseButton = true,
  title = 'Options',
}: {
  heightMode?: 'auto' | 'fixed' | 'full';
  fixedHeight?: string;
  showCloseButton?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Button variant="primary" onClick={() => setOpen(true)}>Open Bottom Sheet</Button>
      <BottomSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        heightMode={heightMode}
        fixedHeight={fixedHeight}
        showCloseButton={showCloseButton}
        title={title}
      >
        <div style={{ padding: '1.5rem', color: 'white' }}>
          <p>This is the bottom sheet content.</p>
          <p style={{ marginTop: '0.5rem', opacity: 0.6 }}>Drag down or tap backdrop to dismiss.</p>
        </div>
      </BottomSheet>
    </div>
  );
}

export const Default: Story = {
  render: () => <BottomSheetDemo heightMode="fixed" fixedHeight="40vh" showCloseButton={true} title="Options" />,
};

export const AutoHeight: Story = {
  render: () => <BottomSheetDemo heightMode="auto" showCloseButton={true} title="Quick Actions" />,
};

export const FullHeight: Story = {
  render: () => <BottomSheetDemo heightMode="full" showCloseButton={true} title="Full Panel" />,
};

export const NoCloseButton: Story = {
  render: () => <BottomSheetDemo heightMode="fixed" fixedHeight="35vh" showCloseButton={false} title="Tap backdrop to close" />,
};
