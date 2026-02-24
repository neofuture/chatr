import type { Meta, StoryObj } from '@storybook/react';
import RangeSlider from './RangeSlider';

const meta: Meta<typeof RangeSlider> = {
  title: 'Form Controls/RangeSlider',
  component: RangeSlider,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    showValue: { control: 'boolean' },
    valuePrefix: { control: 'text' },
    valueSuffix: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Volume', min: 0, max: 100, defaultValue: 50 },
};

export const Percentage: Story = {
  args: { label: 'Opacity', min: 0, max: 100, defaultValue: 75, valueSuffix: '%' },
};

export const Currency: Story = {
  args: { label: 'Budget', min: 0, max: 1000, step: 50, defaultValue: 200, valuePrefix: '£' },
};

export const NoValueDisplay: Story = {
  args: { label: 'Brightness', min: 0, max: 10, defaultValue: 5, showValue: false },
};

