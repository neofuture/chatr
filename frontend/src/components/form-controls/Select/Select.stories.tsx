import type { Meta, StoryObj } from '@storybook/react';
import Select from './Select';

const meta: Meta<typeof Select> = {
  title: 'Form Controls/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select>
      <option value="">Select a country…</option>
      <option value="gb">United Kingdom</option>
      <option value="us">United States</option>
      <option value="ca">Canada</option>
      <option value="au">Australia</option>
    </Select>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <Select label="Country">
      <option value="">Choose…</option>
      <option value="gb">United Kingdom</option>
      <option value="us">United States</option>
    </Select>
  ),
};

export const WithError: Story = {
  render: () => (
    <Select label="Timezone" error="Please select a timezone">
      <option value="">Select timezone…</option>
      <option value="utc">UTC</option>
      <option value="gmt">GMT+1</option>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select label="Region (locked)" disabled>
      <option value="eu">Europe</option>
    </Select>
  ),
};

