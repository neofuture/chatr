import type { Meta, StoryObj } from '@storybook/react';
import Logo from './Logo';

const meta: Meta<typeof Logo> = {
  title: 'UI/Logo',
  component: Logo,
  tags: ['autodocs'],
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        component: 'Chatr logo in horizontal or vertical orientation at three sizes.',
      },
    },
  },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'radio', options: ['horizontal', 'vertical'] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const HorizontalMd: Story = {
  args: { size: 'md', variant: 'horizontal' },
};

export const HorizontalSm: Story = {
  args: { size: 'sm', variant: 'horizontal' },
};

export const HorizontalLg: Story = {
  args: { size: 'lg', variant: 'horizontal' },
};

export const Vertical: Story = {
  args: { size: 'md', variant: 'vertical' },
};
