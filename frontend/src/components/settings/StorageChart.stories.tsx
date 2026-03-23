import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import StorageChart from './StorageChart';

const meta: Meta<typeof StorageChart> = {
  title: 'Settings/StorageChart',
  component: StorageChart,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Pie chart showing browser storage usage breakdown (IndexedDB, localStorage, cache).',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StorageChart>;

export const Default: Story = {};

export const Refreshed: Story = {
  args: { refreshKey: 1 },
};
