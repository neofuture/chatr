import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import Button from './Button';

const meta: Meta<typeof Button> = {
  title: 'Form Controls/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Versatile button with primary/secondary/danger/ghost variants and theme colour options.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost', 'purple', 'green', 'red', 'blue', 'orange'],
    },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { onClick: fn() },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: 'primary', children: 'Primary Button', size: 'md' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary Button', size: 'md' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Delete Account', size: 'md' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Cancel', size: 'md' },
};

export const Small: Story = {
  args: { variant: 'primary', children: 'Small', size: 'sm' },
};

export const Large: Story = {
  args: { variant: 'primary', children: 'Large', size: 'lg' },
};

export const FullWidth: Story = {
  args: { variant: 'primary', children: 'Full Width Button', fullWidth: true },
};

export const Disabled: Story = {
  args: { variant: 'primary', children: 'Disabled', disabled: true },
};

export const Purple: Story = {
  args: { variant: 'purple', children: 'Purple Theme' },
};

export const Green: Story = {
  args: { variant: 'green', children: 'Green Theme' },
};

export const Blue: Story = {
  args: { variant: 'blue', children: 'Blue Theme' },
};

export const Orange: Story = {
  args: { variant: 'orange', children: 'Orange Theme' },
};

export const Red: Story = {
  args: { variant: 'red', children: 'Red Theme' },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="purple">Purple</Button>
      <Button variant="green">Green</Button>
      <Button variant="blue">Blue</Button>
      <Button variant="orange">Orange</Button>
      <Button variant="red">Red</Button>
    </div>
  ),
};

