import type { Meta, StoryObj } from '@storybook/react';
import Radio from './Radio';

const meta: Meta<typeof Radio> = {
  title: 'Form Controls/Radio',
  component: Radio,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const themeOptions = [
  { value: 'dark', label: 'Dark Mode' },
  { value: 'light', label: 'Light Mode' },
  { value: 'system', label: 'System Default' },
];

export const Default: Story = {
  args: {
    label: 'Appearance',
    name: 'theme',
    options: themeOptions,
  },
};

export const WithDefault: Story = {
  args: {
    label: 'Notification frequency',
    name: 'freq',
    defaultValue: 'daily',
    options: [
      { value: 'realtime', label: 'Real-time' },
      { value: 'daily', label: 'Daily digest' },
      { value: 'weekly', label: 'Weekly summary' },
      { value: 'never', label: 'Never' },
    ],
  },
};

export const WithDisabledOption: Story = {
  args: {
    label: 'Subscription plan',
    name: 'plan',
    options: [
      { value: 'free', label: 'Free' },
      { value: 'pro', label: 'Pro' },
      { value: 'enterprise', label: 'Enterprise (contact sales)', disabled: true },
    ],
  },
};

export const WithError: Story = {
  args: {
    label: 'Gender',
    name: 'gender',
    error: 'Please select an option',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Other / Prefer not to say' },
    ],
  },
};

