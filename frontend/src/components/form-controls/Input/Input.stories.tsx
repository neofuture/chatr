import type { Meta, StoryObj } from '@storybook/react';
import Input from './Input';

const meta: Meta<typeof Input> = {
  title: 'Form Controls/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Text input with optional label, error state, and icon slot.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search'] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Enter text…' },
};

export const WithLabel: Story = {
  args: { label: 'Email address', placeholder: 'user@example.com', type: 'email' },
};

export const WithError: Story = {
  args: { label: 'Password', value: 'short', error: 'Password must be at least 8 characters', readOnly: true },
};

export const WithIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search users…',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
};

export const Password: Story = {
  args: { label: 'Password', type: 'password', placeholder: '••••••••' },
};

export const Disabled: Story = {
  args: { label: 'Disabled field', value: 'Cannot edit', disabled: true, readOnly: true },
};

