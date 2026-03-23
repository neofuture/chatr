import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import PaneSearchBox from './PaneSearchBox';

const meta: Meta<typeof PaneSearchBox> = {
  title: 'Common/PaneSearchBox',
  component: PaneSearchBox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Search input with clear button, used in side panels for filtering lists.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PaneSearchBox>;

export const Empty: Story = {
  args: { value: '', onChange: fn(), onClear: fn() },
};

export const WithValue: Story = {
  args: { value: 'test query', onChange: fn(), onClear: fn() },
};

export const CustomPlaceholder: Story = {
  args: { value: '', onChange: fn(), onClear: fn(), placeholder: 'Find a conversation…' },
};

export const AutoFocused: Story = {
  args: { value: '', onChange: fn(), onClear: fn(), autoFocus: true },
};
