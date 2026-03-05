import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import DualRangeSlider from './DualRangeSlider';

const meta: Meta<typeof DualRangeSlider> = {
  title: 'Form Controls/DualRangeSlider',
  component: DualRangeSlider,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Dual-handle range slider for selecting a min/max value range.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [(Story) => <div style={{ width: 320, padding: 24 }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof DualRangeSlider>;

export const Default: Story = {
  args: {
    label: 'Price Range',
    min: 0,
    max: 1000,
    defaultMinValue: 200,
    defaultMaxValue: 800,
    showValues: true,
    valuePrefix: '£',
    onChange: (min, max) => console.log(min, max),
  },
};

export const AgeRange: Story = {
  args: {
    label: 'Age Range',
    min: 18,
    max: 100,
    defaultMinValue: 25,
    defaultMaxValue: 50,
    showValues: true,
    valueSuffix: ' yrs',
  },
};

export const Percentage: Story = {
  args: {
    label: 'Match Percentage',
    min: 0,
    max: 100,
    defaultMinValue: 40,
    defaultMaxValue: 90,
    showValues: true,
    valueSuffix: '%',
    step: 5,
  },
};

export const WithError: Story = {
  args: {
    label: 'Budget',
    min: 0,
    max: 500,
    defaultMinValue: 100,
    defaultMaxValue: 400,
    showValues: true,
    valuePrefix: '$',
    error: 'Range must be at least £50 apart',
  },
};

