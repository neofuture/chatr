import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import ToastContainer from './ToastContainer';
import Button from '@/components/form-controls/Button/Button';

const meta: Meta = {
  title: 'Utility/ToastContainer',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: { component: 'Global toast notification system. Toasts slide in from the top-right with pause-on-hover and progress tracking.' },
    },
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
        <ToastContainer />
      </ToastProvider>
    ),
  ],
};

export default meta;

function ToastTriggers() {
  const { showToast } = useToast();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '2rem' }}>
      <Button variant="green" onClick={() => showToast('Profile saved successfully!', 'success')}>
        Success Toast
      </Button>
      <Button variant="red" onClick={() => showToast('Something went wrong. Please try again.', 'error')}>
        Error Toast
      </Button>
      <Button variant="blue" onClick={() => showToast('Your session will expire in 5 minutes.', 'info')}>
        Info Toast
      </Button>
      <Button variant="orange" onClick={() => showToast('Unsaved changes will be lost.', 'warning')}>
        Warning Toast
      </Button>
    </div>
  );
}

export const AllTypes: StoryObj = {
  render: () => <ToastTriggers />,
};

export const Success: StoryObj = {
  render: () => {
    function Demo() {
      const { showToast } = useToast();
      return <Button variant="green" onClick={() => showToast('Changes saved!', 'success')}>Show</Button>;
    }
    return <div style={{ padding: '2rem' }}><Demo /></div>;
  },
};

export const Error: StoryObj = {
  render: () => {
    function Demo() {
      const { showToast } = useToast();
      return <Button variant="red" onClick={() => showToast('Upload failed — file too large.', 'error')}>Show</Button>;
    }
    return <div style={{ padding: '2rem' }}><Demo /></div>;
  },
};
