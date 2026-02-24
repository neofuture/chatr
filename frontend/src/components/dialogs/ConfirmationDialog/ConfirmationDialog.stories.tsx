import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { useState } from 'react';
import { ConfirmationProvider, useConfirmation } from '@/contexts/ConfirmationContext';
import ConfirmationDialog from './ConfirmationDialog';
import Button from '@/components/form-controls/Button/Button';

const meta: Meta = {
  title: 'Dialogs/ConfirmationDialog',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Modal confirmation dialog driven by ConfirmationContext. Supports info, warning, and danger urgency levels with customisable action buttons.',
      },
    },
  },
};

export default meta;

function ConfirmationDemo({
  title,
  message,
  urgency,
}: {
  title: string;
  message: string;
  urgency: 'info' | 'warning' | 'danger';
}) {
  const { showConfirmation } = useConfirmation();
  const [result, setResult] = useState<string | null>(null);

  const open = async () => {
    const value = await showConfirmation({
      title,
      message,
      urgency,
      actions: [
        { label: 'Cancel', variant: 'secondary', value: 'cancel' },
        { label: urgency === 'danger' ? 'Delete' : 'Confirm', variant: urgency === 'danger' ? 'destructive' : 'primary', value: 'confirm' },
      ],
    });
    setResult(value ?? 'dismissed');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <Button variant="primary" onClick={open}>Open Dialog</Button>
        {result && <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Result: <strong style={{ color: 'white' }}>{result}</strong></p>}
      </div>
      <ConfirmationDialog />
    </div>
  );
}

export const Info: StoryObj = {
  render: () => (
    <ConfirmationProvider>
      <ConfirmationDemo title="Confirm action" message="Are you sure you want to proceed with this action?" urgency="info" />
    </ConfirmationProvider>
  ),
};

export const Warning: StoryObj = {
  render: () => (
    <ConfirmationProvider>
      <ConfirmationDemo title="Unsaved changes" message="You have unsaved changes. If you leave now, your changes will be lost." urgency="warning" />
    </ConfirmationProvider>
  ),
};

export const Danger: StoryObj = {
  render: () => (
    <ConfirmationProvider>
      <ConfirmationDemo title="Delete account" message="This will permanently delete your account and all associated data. This action cannot be undone." urgency="danger" />
    </ConfirmationProvider>
  ),
};

