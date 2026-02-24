import type { Meta, StoryObj } from '@storybook/react';
import Textarea from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Form Controls/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    rows: { control: { type: 'number', min: 2, max: 20 } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Enter your message…', rows: 4 },
};

export const WithLabel: Story = {
  args: { label: 'Bio', placeholder: 'Tell us about yourself…', rows: 5 },
};

export const WithError: Story = {
  args: { label: 'Message', error: 'This field is required', rows: 4 },
};

export const Disabled: Story = {
  args: { label: 'Notes', value: 'Read-only content', disabled: true, rows: 3, readOnly: true },
};

