import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SimpleDualRangeSlider from './SimpleDualRangeSlider';

const meta: Meta<typeof SimpleDualRangeSlider> = {
  title: 'Form Controls/SimpleDualRangeSlider',
  component: SimpleDualRangeSlider,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Simplified dual-handle range slider with a cleaner visual style.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [(Story) => <div style={{ width: 320, padding: 24 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof SimpleDualRangeSlider>;

export const Default: Story = {
  args: {
    label: 'Distance',
    min: 0,
    max: 100,
    defaultMinValue: 10,
    defaultMaxValue: 60,
    showValues: true,
    valueSuffix: ' km',
  },
};

export const PriceRange: Story = {
  args: {
    label: 'Price',
    min: 0,
    max: 500,
    defaultMinValue: 50,
    defaultMaxValue: 300,
    showValues: true,
    valuePrefix: '£',
    step: 10,
  },
};

export const WithError: Story = {
  args: {
    label: 'Volume',
    min: 0,
    max: 100,
    defaultMinValue: 20,
    defaultMaxValue: 80,
    showValues: true,
    valueSuffix: '%',
    error: 'Range too narrow',
  },
};

