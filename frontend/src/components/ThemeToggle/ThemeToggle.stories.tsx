import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Utility/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: 'Toggle switch that switches between dark and light themes via ThemeContext.' },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InToolbar: Story = {
  render: () => (
    <ThemeProvider>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: '#1e293b', borderRadius: '8px' }}>
        <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>App toolbar</span>
        <div style={{ marginLeft: 'auto' }}>
          <ThemeToggle />
        </div>
      </div>
    </ThemeProvider>
  ),
};

