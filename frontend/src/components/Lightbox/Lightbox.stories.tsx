import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Lightbox from './Lightbox';
import Button from '@/components/form-controls/Button/Button';

const meta: Meta<typeof Lightbox> = {
  title: 'Utility/Lightbox',
  component: Lightbox,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: { component: 'Full-screen image viewer with keyboard (Escape) and backdrop-click to close.' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

function LightboxDemo({ imageUrl, imageName }: { imageUrl: string; imageName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: '2rem' }}>
      <Button variant="primary" onClick={() => setOpen(true)}>Open Lightbox</Button>
      <Lightbox imageUrl={imageUrl} imageName={imageName} isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export const Default: Story = {
  render: () => <LightboxDemo imageUrl="/cover/default-cover.jpg" imageName="Chatr cover photo" />,
};

export const ProfilePhoto: Story = {
  render: () => <LightboxDemo imageUrl="/profile/default-profile.jpg" imageName="Profile photo" />,
};

