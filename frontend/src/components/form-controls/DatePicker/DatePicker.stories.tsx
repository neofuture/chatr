import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import DatePicker from './DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'Form Controls/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Scroll-wheel date/time picker with calendar view. Supports date-only, time-only, and datetime modes with locale-aware formatting.',
      },
    },
  },
  argTypes: {
    mode: { control: 'radio', options: ['date', 'time', 'datetime'] },
    locale: { control: 'radio', options: ['en-GB', 'en-US'] },
    label: { control: 'text' },
    error: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DateOnly: Story = {
  args: { label: 'Date of birth', mode: 'date', onChange: fn() },
};

export const TimeOnly: Story = {
  args: { label: 'Meeting time', mode: 'time', onChange: fn() },
};

export const DateTime: Story = {
  args: { label: 'Schedule event', mode: 'datetime', onChange: fn() },
};

export const USLocale: Story = {
  args: { label: 'Start date (US format)', mode: 'date', locale: 'en-US', onChange: fn() },
};

export const WithError: Story = {
  args: { label: 'Expiry date', mode: 'date', error: 'Date is required', onChange: fn() },
};

export const WithMinMax: Story = {
  args: {
    label: 'Event date (next 30 days)',
    mode: 'date',
    minDate: new Date(),
    maxDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    onChange: fn(),
  },
};

