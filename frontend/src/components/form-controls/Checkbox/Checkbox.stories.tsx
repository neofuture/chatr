import type { Meta, StoryObj } from '@storybook/react';
import Checkbox from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Form Controls/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    checked: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Accept terms and conditions' },
};

export const Checked: Story = {
  args: { label: 'Remember me', defaultChecked: true },
};

export const WithError: Story = {
  args: { label: 'I agree to the privacy policy', error: 'You must accept the policy to continue' },
};

export const Disabled: Story = {
  args: { label: 'Unavailable option', disabled: true },
};

export const DisabledChecked: Story = {
  args: { label: 'Pre-selected (locked)', disabled: true, defaultChecked: true },
};

export const Group: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Checkbox label="Notifications via email" defaultChecked />
      <Checkbox label="Notifications via SMS" />
      <Checkbox label="Marketing emails" />
      <Checkbox label="Data sharing (required)" disabled defaultChecked />
    </div>
  ),
};

