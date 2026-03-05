import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Calendar from './Calendar';

const meta: Meta<typeof Calendar> = {
  title: 'Form Controls/Calendar',
  component: Calendar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Full calendar date/time picker. Supports date-only, time-only, and date+time modes.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Calendar>;

function Controlled(args: any) {
  const [value, setValue] = useState<Date | undefined>(undefined);
  return <Calendar {...args} value={value} onChange={setValue} />;
}

export const DateMode: Story = {
  render: (args) => <Controlled {...args} />,
  args: { mode: 'date' },
};

export const TimeMode: Story = {
  render: (args) => <Controlled {...args} />,
  args: { mode: 'time' },
};

export const DateTimeMode: Story = {
  render: (args) => <Controlled {...args} />,
  args: { mode: 'datetime' },
};

export const WithPreselectedDate: Story = {
  render: (args) => {
    const [value, setValue] = useState<Date | undefined>(new Date('2026-06-15T14:30:00'));
    return <Calendar {...args} value={value} onChange={setValue} />;
  },
  args: { mode: 'date' },
};

