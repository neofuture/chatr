import type { Meta, StoryObj } from '@storybook/react';
import BackgroundBlobs from './BackgroundBlobs';

const meta: Meta<typeof BackgroundBlobs> = {
  title: 'Utility/BackgroundBlobs',
  component: BackgroundBlobs,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: { component: 'Decorative animated gradient blobs used as background ornamentation on auth and landing pages.' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#0f172a', overflow: 'hidden' }}>
      <BackgroundBlobs />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', fontSize: '1.5rem' }}>
        Content sits above the blobs
      </div>
    </div>
  ),
};

